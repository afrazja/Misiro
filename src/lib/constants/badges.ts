export interface Badge {
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
}

export const ACHIEVEMENTS: Badge[] = [
    {
        id: 'first_lesson',
        title: 'First Steps',
        description: 'Complete Day 1 and begin your journey.',
        icon: '🌱',
        color: 'rgba(46, 204, 113, 1)' // Green
    },
    {
        id: 'active_learner_5',
        title: 'Active Learner',
        description: 'Complete 5 days of lessons.',
        icon: '🔥',
        color: 'rgba(230, 126, 34, 1)' // Orange
    },
    {
        id: 'polyglot_50',
        title: 'Polyglot 50',
        description: 'Save 50 words to your vocabulary.',
        icon: '📖',
        color: 'rgba(52, 152, 219, 1)' // Blue
    },
    {
        id: 'perfectionist',
        title: 'Perfectionist',
        description: 'Earn 1000 XP through speaking correctly.',
        icon: '✨',
        color: 'rgba(241, 196, 15, 1)' // Yellow
    }
];
