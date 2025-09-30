(() => {
  const form = document.getElementById('assessmentForm');
  const scoreCards = document.getElementById('scoreCards');

  // Bind sliders to labels
  document.querySelectorAll('input[type=range]').forEach(r => {
    const label = r.parentElement.querySelector('.score');
    const sync = () => label.textContent = r.value;
    r.addEventListener('input', sync);
    sync();
  });

  const compute = () => {
    const sections = [...form.querySelectorAll('section.card')];
    const values = [];
    const details = {};
    sections.forEach(sec => {
      const valueName = sec.dataset.value;
      const sliders = [...sec.querySelectorAll('input[type=range]')];
      const avg = sliders.reduce((a,s)=>a+Number(s.value),0) / sliders.length;
      values.push({ name: valueName, average: avg });
      details[valueName] = sliders.map((s, i) => ({
        score: Number(s.value),
        behaviour: sec.querySelectorAll('h4')[i].textContent,
        evidence: sec.querySelectorAll('textarea.evidence')[i].value.trim()
      }));
    });
    const reflections = {};
    document.querySelectorAll('textarea.reflect').forEach(t => {
      reflections[t.dataset.q] = t.value.trim();
    });
    return { values, details, reflections };
  };

  const renderCards = (data) => {
    scoreCards.innerHTML = '';
    data.values.forEach(v => {
      const el = document.createElement('div');
      el.className = 'behaviour';
      el.innerHTML = `<div><h4 style="margin:0">${v.name}</h4><p class="subtle">Average across behaviours</p></div><div><strong>${v.average.toFixed(2)} / 5</strong></div>`;
      scoreCards.appendChild(el);
    });
  };

  // Chart
  const radarCtx = document.getElementById('radar').getContext('2d');
  let radar;
  const renderChart = (data) => {
    const labels = data.values.map(v => v.name);
    const scores = data.values.map(v => Number(v.average.toFixed(2)));
    if(radar) radar.destroy();
    radar = new Chart(radarCtx, {
      type: 'radar',
      data: { labels, datasets: [{ label: 'Average score', data: scores, fill: true }] },
      options: { responsive: true, scales: { r: { suggestedMin: 0, suggestedMax: 5, ticks: { stepSize: 1 } }}, plugins: { legend: { display: false } } }
    });
  };

  // Local storage
  const saveDraft = () => localStorage.setItem('sa-values-bespoke', JSON.stringify(compute()));
  const loadDraft = () => {
    const raw = localStorage.getItem('sa-values-bespoke');
    if(!raw) return;
    try {
      const data = JSON.parse(raw);
      const allTextareas = [...document.querySelectorAll('textarea.evidence:not(.reflect)')];
      const allRanges = [...document.querySelectorAll('input[type=range]')];
      const flatDetails = Object.values(data.details || {}).flat();
      if(flatDetails.length === allTextareas.length && flatDetails.length === allRanges.length){
        flatDetails.forEach((d, i)=>{
          allRanges[i].value = d.score;
          allTextareas[i].value = d.evidence || '';
          allRanges[i].dispatchEvent(new Event('input'));
        });
      }
      (data.reflections || {}) && Object.entries(data.reflections).forEach(([k,v])=>{
        const el = document.querySelector(`textarea.reflect[data-q="${k}"]`);
        if(el) el.value = v;
      });
    } catch(e){}
  };

  // Buttons
  document.getElementById('copyBtn').addEventListener('click', async () => {
    const data = compute();
    const lines = [];
    lines.push('scarlettabbott — Values & Behaviours self-assessment');
    data.values.forEach(v => lines.push(`• ${v.name}: ${v.average.toFixed(2)}/5`));
    lines.push('');
    Object.entries(data.details).forEach(([val, items])=>{
      lines.push(val.toUpperCase());
      items.forEach(it => lines.push(`  - ${it.behaviour}: ${it.score}/5${it.evidence? ` — ${it.evidence}`:''}`));
      lines.push('');
    });
    lines.push('REFLECTIONS');
    if (data.reflections.UNITED) lines.push(`• UNITED: ${data.reflections.UNITED}`);
    if (data.reflections.BRILLIANT) lines.push(`• BRILLIANT: ${data.reflections.BRILLIANT}`);
    if (data.reflections.UNSTOPPABLE) lines.push(`• UNSTOPPABLE: ${data.reflections.UNSTOPPABLE}`);
    if (data.reflections.OTHER) lines.push(`• OTHER: ${data.reflections.OTHER}`);
    await navigator.clipboard.writeText(lines.join('\\n'));
    alert('Summary copied to clipboard.');
  });

  document.getElementById('saveBtn').addEventListener('click', () => { saveDraft(); alert('Saved locally in your browser (Draft).'); });

  document.getElementById('pdfBtn').addEventListener('click', async () => {
    const { jsPDF } = window.jspdf;
    const capture = document.createElement('div');
    capture.style.padding = '24px';
    capture.style.width = '900px';
    capture.style.fontFamily = getComputedStyle(document.body).fontFamily;
    capture.style.background = '#fff';
    capture.style.color = '#141414';
    const data = compute();
    capture.innerHTML = `
      <h2 style="margin:0 0 12px 0">Values & Behaviours self-assessment</h2>
      <div style="margin:8px 0 16px; color:#666">Generated ${new Date().toLocaleString()}</div>
      <div style="display:flex; gap:16px">
        <div id="chartMount" style="flex:1"></div>
        <div style="flex:1">
          ${data.values.map(v => `<div style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #eee"><strong>${v.name}</strong><span>${v.average.toFixed(2)}/5</span></div>`).join('')}
        </div>
      </div>
      <h3>Detail</h3>
      ${Object.entries(data.details).map(([val, items])=>`
        <h4 style="margin:12px 0 6px">${val}</h4>
        <ul style="margin:0 0 8px 18px">
          ${items.map(it=>`<li><strong>${it.behaviour}</strong>: ${it.score}/5${it.evidence? ` — ${it.evidence}`:''}</li>`).join('')}
        </ul>
      `).join('')}
      <h3>Reflections</h3>
      <ul style="margin:0 0 8px 18px">
        ${data.reflections.UNITED ? `<li><strong>UNITED:</strong> ${data.reflections.UNITED}</li>` : ''}
        ${data.reflections.BRILLIANT ? `<li><strong>BRILLIANT:</strong> ${data.reflections.BRILLIANT}</li>` : ''}
        ${data.reflections.UNSTOPPABLE ? `<li><strong>UNSTOPPABLE:</strong> ${data.reflections.UNSTOPPABLE}</li>` : ''}
        ${data.reflections.OTHER ? `<li><strong>OTHER:</strong> ${data.reflections.OTHER}</li>` : ''}
      </ul>
    `;
    document.body.appendChild(capture);

    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 300;
    capture.querySelector('#chartMount').appendChild(canvas);
    new Chart(canvas.getContext('2d'), {
      type: 'radar',
      data: { labels: data.values.map(v=>v.name), datasets: [{ label: 'Average', data: data.values.map(v=>v.average), fill: true }] },
      options: { plugins:{legend:{display:false}}, scales:{r:{suggestedMin:0, suggestedMax:5}} }
    });
    await new Promise(r=>setTimeout(r, 250));

    const canvasShot = await html2canvas(capture);
    const imgData = canvasShot.toDataURL('image/png');

    const pdf = new jsPDF({ unit:'pt', format:'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const imgW = pageW - 80;
    const imgH = canvasShot.height * (imgW / canvasShot.width);
    pdf.addImage(imgData, 'PNG', 40, 40, imgW, imgH);
    pdf.save('sa-values-self-assessment.pdf');
    document.body.removeChild(capture);
  });

  // Live updates
  const refresh = () => { const d = compute(); renderCards(d); renderChart(d); saveDraft(); };
  form.addEventListener('input', refresh);

  // Init
  loadDraft();
  refresh();
})();
