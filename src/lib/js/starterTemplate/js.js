// WebMold landing page interactions.
// 1) Hero: hovering a canvas block highlights the HTML it produces, and vice versa.
// 2) Code section: a small tab switcher between the three exported files.

(function heroLinking() {
  const stage = document.getElementById('demoStage');
  if (!stage) return;

  const blocks = Array.from(stage.querySelectorAll('.demo-block'));
  const lines = Array.from(document.querySelectorAll('#demoCode .ln'));

  function setActive(target) {
    blocks.forEach((block) => block.classList.toggle('is-active', block.dataset.target === target));
    lines.forEach((line) => line.classList.toggle('is-active', line.dataset.line === target));
  }

  function clearActive() {
    blocks.forEach((block) => block.classList.remove('is-active'));
    lines.forEach((line) => line.classList.remove('is-active'));
  }

  blocks.forEach((block) => {
    block.addEventListener('mouseenter', () => setActive(block.dataset.target));
    block.addEventListener('mouseleave', clearActive);
    block.addEventListener('focus', () => setActive(block.dataset.target));
    block.addEventListener('blur', clearActive);
  });

  lines.forEach((line) => {
    line.addEventListener('mouseenter', () => setActive(line.dataset.line));
    line.addEventListener('mouseleave', clearActive);
  });
})();

(function exportTabs() {
  const tabs = Array.from(document.querySelectorAll('.code-tab'));
  const output = document.getElementById('exportCode');
  if (!tabs.length || !output) return;

  const files = {
    html: `&lt;section class="pricing-card" id="html-14"&gt;
  &lt;p class="pricing-eyebrow"&gt;Studio plan&lt;/p&gt;
  &lt;h3 class="pricing-figure"&gt;$24&lt;span&gt;/mo&lt;/span&gt;&lt;/h3&gt;
  &lt;ul class="pricing-list"&gt;
    &lt;li&gt;Unlimited canvases&lt;/li&gt;
    &lt;li&gt;Export to HTML, CSS, JS&lt;/li&gt;
    &lt;li&gt;Reopen and re-edit&lt;/li&gt;
  &lt;/ul&gt;
  &lt;button class="cta" id="html-19"&gt;Choose Studio&lt;/button&gt;
&lt;/section&gt;`,
    css: `.pricing-card {
  background: #1c1914;
  border: 1px solid rgba(244, 238, 227, 0.09);
  border-radius: 10px;
  padding: 28px;
}

.pricing-figure {
  font-size: 2.4rem;
  margin: 10px 0 18px;
}

.cta {
  background: #e6762f;
  color: #17110a;
  border: none;
  border-radius: 7px;
  padding: 10px 18px;
}`,
    js: `document.getElementById('html-19').addEventListener('click', () => {
  // Wired up on the canvas by selecting the button
  // and attaching a "click" action - this is the
  // exact listener WebMold writes for it.
  startCheckout('studio');
});`
  };

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((other) => {
        other.classList.toggle('is-active', other === tab);
        other.setAttribute('aria-selected', String(other === tab));
      });
      const file = tab.dataset.file;
      output.dataset.file = file;
      output.innerHTML = files[file] || '';
    });
  });
})();
