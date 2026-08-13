/**
 * Every string the onboarding wizard shows, in both languages.
 *
 * Lifted out of the component so it can be tested. It was inline, and a
 * careless replace-all rewrote all 37 English values with their own
 * lookup tokens — English users would have read "{t.q1}" on screen. Types
 * passed, 538 tests passed, and the page cannot be opened without a
 * session, so nothing caught it. A plain object with a test can.
 */

export interface OnboardingStrings {
	[key: string]: string;
}

export function onboardingStrings(isFa: boolean): OnboardingStrings {
	return {
		saving: isFa ? "در حال شخصی‌سازی تجربهٔ شما…" : "Personalizing your experience…",
		retry: isFa ? "تلاش دوباره" : "Retry",
		continue: isFa ? "ادامه ←" : "Continue →",

		q1: isFa ? "چه زبانی می‌خواهی یاد بگیری؟" : "What do you want to learn?",
		q1sub: isFa ? "زبانی را انتخاب کن که می‌خواهی در آن مسلط شوی." : "Select the language you want to master.",
		german: isFa ? "آلمانی" : "German",
		french: isFa ? "فرانسوی" : "French",

		q2: isFa ? "توضیح‌ها به کدام زبان باشد؟" : "Which language should we use for explanations?",
		q2sub: isFa
			? "زبان راهنماها، نکته‌ها و قواعد دستوری."
			: "This is the language of instructions, hints, and grammar rules.",

		q3: isFa ? "چرا این زبان را یاد می‌گیری؟" : "Why are you learning it?",
		q3sub: isFa
			? "این کمک می‌کند هدفت را بفهمیم و انگیزه‌ات را حفظ کنیم."
			: "This helps us understand your goals and keep you motivated.",
		rCareer: isFa ? "کار / شغل" : "Career / Work",
		rTravel: isFa ? "سفر و تفریح" : "Travel & Leisure",
		rStudy: isFa ? "دانشگاه / تحصیل" : "University / Study",
		rMove: isFa ? "مهاجرت" : "Relocation / Moving",
		rPeople: isFa ? "ارتباط با آدم‌ها" : "Connections",
		rBrain: isFa ? "تمرین ذهن" : "Brain Training",

		q4: isFa ? "برای آزمون گوته A1 آماده می‌شوی؟" : "Are you preparing for the Goethe A1 exam?",
		q4sub: isFa
			? "اگر تاریخ داری، برنامهٔ روزانه‌ات تا آن روز شمارش معکوس می‌کند و نشان می‌دهد چقدر آماده‌ای."
			: "If you have a date, your daily plan counts down to it — and shows exactly how ready you are.",
		eBooked: isFa ? "بله — تاریخ آزمونم مشخص است" : "Yes — my exam is booked",
		ePlanned: isFa ? "قصد دارم شرکت کنم" : "Planning to take it",
		eNone: isFa ? "برای آزمون نیست" : "Not for an exam",
		eNoneSub: isFa
			? "برای زندگی روزمره آلمانی یاد می‌گیرم."
			: "I'm learning German for daily life.",
		eUnsure: isFa ? "هنوز مطمئن نیستم" : "Not sure yet",
		examWhen: isFa ? "آزمونت کِی است؟" : "When is your exam?",
		readyWhen: isFa ? "کِی می‌خواهی آمادهٔ آزمون باشی؟" : "When do you want to be exam-ready?",
		noDate: isFa ? "هنوز تاریخی ندارم" : "I don't have a date yet",
		in3: isFa ? "حدود ۳ ماه دیگر" : "In ~3 months",
		in6: isFa ? "حدود ۶ ماه دیگر" : "In ~6 months",
		in12: isFa ? "تا یک سال دیگر" : "Within a year",
		noDateSub: isFa
			? "هنوز تاریخی رزرو نکرده‌ای — یک هدف زمانی بگذار."
			: "No date booked yet — set a ready-by target.",

		q5sub: isFa ? "نگران نباش، همه از جایی شروع می‌کنند." : "Don't worry, everyone starts somewhere.",
		lNone: isFa ? "کاملاً مبتدی هستم" : "I'm a complete beginner",
		lNoneSub: isFa ? "اصلاً چیزی بلد نیستم." : "I know absolutely nothing.",
		lFew: isFa ? "چند کلمه‌ای بلدم" : "I know a few words",
		lFewSub: isFa ? "سلام و احوالپرسی، اعداد، جمله‌های ساده." : "Greetings, numbers, simple phrases.",
		lBasic: isFa ? "می‌توانم گفتگوی ساده داشته باشم" : "I can have basic conversations",
		lBasicSub: isFa
			? "ولی می‌خواهم روان‌تر و مطمئن‌تر صحبت کنم."
			: "But I want to build fluency and confidence.",

		q6: isFa ? "هدف روزانه‌ات چیست؟" : "What's your daily goal?",
		gCasual: isFa ? "سبک · مناسب روزهای شلوغ." : "Casual · Good for busy days.",
		gRegular: isFa ? "منظم · پیشرفت پیوسته. (پیشنهادی)" : "Regular · Steady progress. (Recommended)",
		gSerious: isFa ? "جدی · پیشرفت سریع." : "Serious · Rapid advancement."
	};
}
