
function getScoreIconHtml(voteAverage) {
    if (!voteAverage) return '';

    const score = parseFloat(voteAverage);
    const percentage = Math.round(score * 10);
    const dashOffset = 100 - percentage;

    // Determine color based on score
    let color = '#21d07a'; // Green
    if (score < 7) color = '#d2d531'; // Yellow
    if (score < 4) color = '#db2360'; // Red

    return `
    <div class="score-icon">
      <svg viewBox="0 0 36 36">
        <path class="track"
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="#204529"
          stroke-width="3"
        />
        <path class="progress"
          d="M18 2.0845
            a 15.9155 15.9155 0 0 1 0 31.831
            a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="${color}"
          stroke-width="3"
          stroke-dasharray="100, 100"
          style="--target-offset: ${dashOffset}"
        />
      </svg>
      <div class="score-text">
        ${percentage}<span class="percent">%</span>
      </div>
    </div>
  `;
}
