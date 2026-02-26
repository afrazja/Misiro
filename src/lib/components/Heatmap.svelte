<script lang="ts">
    let { practiceDates = new Set<string>() } = $props<{
        practiceDates: Set<string>;
    }>();

    // Calculate the last ~24 weeks to fit perfectly on most screens without too much scrolling
    // GitHub's full calendar is 52 weeks, but for language learning 6 months is often visually better on mobile
    let weeks = $derived.by(() => {
        const result = [];
        const today = new Date();
        const startDate = new Date(today);

        // 24 weeks * 7 days
        const daysToSubtract = 24 * 7 - 1;
        startDate.setDate(today.getDate() - daysToSubtract);

        // Align to Sunday
        const dayOfWeek = startDate.getDay();
        startDate.setDate(startDate.getDate() - dayOfWeek);

        let currDate = new Date(startDate);

        for (let w = 0; w < 24; w++) {
            let weekDays = [];
            for (let d = 0; d < 7; d++) {
                const ds = `${currDate.getFullYear()}-${String(currDate.getMonth() + 1).padStart(2, "0")}-${String(currDate.getDate()).padStart(2, "0")}`;
                const isToday =
                    ds ===
                    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                let intensity = 0;

                if (practiceDates.has(ds)) {
                    // We can just use a default green intensity for practiced days
                    intensity = 2;
                }

                weekDays.push({
                    date: ds,
                    dateObj: new Date(currDate),
                    intensity,
                    isToday,
                });
                currDate.setDate(currDate.getDate() + 1);
            }
            result.push(weekDays);
        }
        return result;
    });
</script>

<div class="heatmap-section" id="history">
    <div class="heatmap-header">
        <h2>Practice History</h2>
        <span class="heatmap-total">🔥 {practiceDates.size} Days Learned</span>
    </div>

    <div class="heatmap-scroll">
        <div class="heatmap-grid">
            <!-- Day Labels (Mon, Wed, Fri) -->
            <div class="heatmap-days-labels">
                <span>Mon</span>
                <span>Wed</span>
                <span>Fri</span>
            </div>

            <div class="heatmap-weeks">
                {#each weeks as week}
                    <div class="heatmap-week">
                        {#each week as day}
                            <!-- Note: Tooltips natively with "title" -->
                            <div
                                class="heatmap-cell level-{day.intensity} {day.isToday
                                    ? 'is-today'
                                    : ''}"
                                title="{day.date}: {day.intensity > 0
                                    ? 'Practiced!'
                                    : 'No practice'}"
                            >
                                {#if day.isToday}
                                    <span class="today-ring"></span>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/each}
            </div>
        </div>
    </div>

    <div class="heatmap-legend">
        <span class="legend-lbl">Less</span>
        <div class="heatmap-cell level-0"></div>
        <div class="heatmap-cell level-2"></div>
        <span class="legend-lbl">More</span>
    </div>
</div>

<style>
    .heatmap-section {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        padding: 24px 28px;
        margin-bottom: 24px;
    }

    .heatmap-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    .heatmap-header h2 {
        font-size: 1.25rem;
        font-weight: 800;
        color: #fff;
        margin: 0;
    }

    .heatmap-total {
        font-size: 0.9rem;
        font-weight: 700;
        color: #e94560;
        background: rgba(233, 69, 96, 0.15);
        padding: 4px 10px;
        border-radius: 12px;
    }

    .heatmap-scroll {
        overflow-x: auto;
        overflow-y: hidden;
        padding-bottom: 12px;
        /* Custom scrollbar */
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
    }

    .heatmap-scroll::-webkit-scrollbar {
        height: 6px;
    }
    .heatmap-scroll::-webkit-scrollbar-track {
        background: transparent;
    }
    .heatmap-scroll::-webkit-scrollbar-thumb {
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
    }

    .heatmap-grid {
        display: flex;
        gap: 8px;
        min-width: max-content;
    }

    .heatmap-days-labels {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        font-size: 0.7rem;
        color: #777;
        padding: 22px 0 8px 0; /* Align with cells */
        gap: 14px;
    }

    .heatmap-weeks {
        display: flex;
        gap: 6px;
    }

    .heatmap-week {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .heatmap-cell {
        width: 14px;
        height: 14px;
        border-radius: 4px;
        position: relative;
        transition: transform 0.1s;
    }

    .heatmap-cell:hover {
        transform: scale(1.2);
        z-index: 2;
    }

    /* Colors */
    .level-0 {
        background: rgba(255, 255, 255, 0.05); /* Empty */
        border: 1px solid rgba(255, 255, 255, 0.03);
    }

    .level-2 {
        background: #2ecc71; /* Solid Green */
        box-shadow: 0 0 10px rgba(46, 204, 113, 0.3);
    }

    .is-today {
        border: 1px solid #e94560;
    }

    .today-ring {
        position: absolute;
        inset: -3px;
        border: 1px dashed rgba(233, 69, 96, 0.8);
        border-radius: 6px;
        pointer-events: none;
    }

    .heatmap-legend {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;
        margin-top: 12px;
    }

    .legend-lbl {
        font-size: 0.75rem;
        color: #777;
        margin: 0 4px;
    }

    @media (max-width: 700px) {
        .heatmap-section {
            padding: 20px 16px;
        }
    }
</style>
