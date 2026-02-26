<script lang="ts">
    import { ACHIEVEMENTS } from "$lib/constants/badges";

    let { unlockedIds = [] } = $props<{
        unlockedIds: string[];
    }>();
</script>

<div class="trophy-cabinet">
    <div class="cabinet-header">
        <h2>Trophy Cabinet</h2>
        <span>{unlockedIds.length} / {ACHIEVEMENTS.length}</span>
    </div>

    <div class="badges-grid">
        {#each ACHIEVEMENTS as badge}
            {@const isUnlocked = unlockedIds.includes(badge.id)}
            <div class="badge-card {isUnlocked ? 'unlocked' : 'locked'}">
                <div
                    class="badge-icon"
                    style="background: {isUnlocked
                        ? badge.color + '20'
                        : 'rgba(255,255,255,0.05)'}; 
						   border: 2px solid {isUnlocked ? badge.color : 'rgba(255,255,255,0.1)'}"
                >
                    <span
                        style="filter: {isUnlocked
                            ? 'none'
                            : 'grayscale(100%) opacity(30%)'}"
                        >{badge.icon}</span
                    >
                </div>
                <div class="badge-info">
                    <h4>{badge.title}</h4>
                    <p>{badge.description}</p>
                </div>
            </div>
        {/each}
    </div>
</div>

<style>
    .trophy-cabinet {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        padding: 24px 28px;
        margin-bottom: 32px;
    }

    .cabinet-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    .cabinet-header h2 {
        font-size: 1.25rem;
        font-weight: 800;
        color: #fff;
        margin: 0;
    }

    .cabinet-header span {
        font-size: 0.9rem;
        font-weight: 700;
        color: #a0a0a0;
        background: rgba(255, 255, 255, 0.1);
        padding: 4px 10px;
        border-radius: 12px;
    }

    .badges-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 16px;
    }

    .badge-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.02);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.04);
        transition: transform 0.2s ease;
    }

    .badge-card.unlocked:hover {
        transform: translateY(-2px);
        background: rgba(255, 255, 255, 0.04);
    }

    .badge-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        flex-shrink: 0;
    }

    .badge-info h4 {
        margin: 0 0 4px;
        font-size: 1rem;
        font-weight: 700;
        color: #fff;
    }

    .locked .badge-info h4 {
        color: #888;
    }

    .badge-info p {
        margin: 0;
        font-size: 0.8rem;
        color: #999;
        line-height: 1.3;
    }

    @media (max-width: 700px) {
        .trophy-cabinet {
            padding: 20px 16px;
        }

        .badges-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
