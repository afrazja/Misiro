-- ============================================================================
-- Email afz.javan@gmail.com whenever a new user registers.
--
-- How it works: an AFTER INSERT trigger on auth.users calls Resend's HTTP API
-- (via the pg_net extension) to send a notification email. The call is async,
-- so it never blocks or slows down the signup itself.
--
-- Prerequisites (do these first — see the steps in the chat):
--   1. A Resend account with mirifer.com verified (DNS records added).
--   2. A Resend API key stored in Supabase Vault under the name 'resend_api_key'.
--
-- Run this whole file once in the Supabase SQL Editor.
-- ============================================================================

-- 1. Make sure pg_net (async HTTP from Postgres) is available.
create extension if not exists pg_net with schema extensions;

-- 2. Store your Resend API key in Vault (run ONCE; replace the placeholder).
--    If you ever rotate the key, run:
--      select vault.update_secret(
--        (select id from vault.secrets where name = 'resend_api_key'),
--        're_your_new_key');
--    Re-running create_secret with the same name errors, so it's commented out;
--    uncomment for the very first run only.
--
-- select vault.create_secret('re_XXXXXXXXXXXXXXXXXXXX', 'resend_api_key');

-- 3. The trigger function.
create or replace function public.notify_admin_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  api_key text;
  request_id bigint;
begin
  -- Skip rows that somehow have no email (e.g. certain OAuth edge cases).
  if new.email is null then
    return new;
  end if;

  -- Pull the Resend key from Vault.
  select decrypted_secret into api_key
  from vault.decrypted_secrets
  where name = 'resend_api_key'
  limit 1;

  if api_key is null then
    raise warning 'notify_admin_on_signup: resend_api_key not found in Vault; skipping email';
    return new;
  end if;

  -- Fire-and-forget POST to Resend.
  select net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
                 'Authorization', 'Bearer ' || api_key,
                 'Content-Type',  'application/json'
               ),
    body    := jsonb_build_object(
                 'from',    'Mirifer <noreply@mirifer.com>',
                 'to',      array['afz.javan@gmail.com'],
                 'subject', 'New Mirifer signup: ' || new.email,
                 'html',    '<h2>🎉 New user registered</h2>'
                            || '<p><strong>Email:</strong> ' || new.email || '</p>'
                            || '<p><strong>User ID:</strong> ' || new.id || '</p>'
                            || '<p><strong>Registered at:</strong> ' || new.created_at || '</p>'
               )
  ) into request_id;

  return new;
exception
  when others then
    -- Never let a notification failure block a signup.
    raise warning 'notify_admin_on_signup failed: %', sqlerrm;
    return new;
end;
$$;

-- 4. Attach it to auth.users.
drop trigger if exists on_auth_user_created_notify on auth.users;

create trigger on_auth_user_created_notify
  after insert on auth.users
  for each row
  execute function public.notify_admin_on_signup();
