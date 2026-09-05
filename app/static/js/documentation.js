/**
 * Lynislens Enterprise Suite — Documentation & Architecture Explorer Controller
 * Version 2.0.0
 */

(function() {
  document.addEventListener('DOMContentLoaded', () => {
    const docModal = document.getElementById('docModal');
    const btnCloseDocModal = document.getElementById('btnCloseDocModal');
    const btnDocClose = document.getElementById('btnDocClose');
    const drawerBtnDoc = document.getElementById('drawerBtnDoc');
    const aboutModal = document.getElementById('aboutModal');
    const btnCloseAboutModal = document.getElementById('btnCloseAboutModal');
    const drawerBtnAbout = document.getElementById('drawerBtnAbout');

    function openDocModal() {
      if (docModal) docModal.classList.add('active');
    }
    function closeDocModal() {
      if (docModal) docModal.classList.remove('active');
    }

    function openAboutModal() {
      if (aboutModal) aboutModal.classList.add('active');
    }
    function closeAboutModal() {
      if (aboutModal) aboutModal.classList.remove('active');
    }

    window.openDocModal = openDocModal;
    window.closeDocModal = closeDocModal;
    window.openAboutModal = openAboutModal;
    window.closeAboutModal = closeAboutModal;

    if (btnCloseDocModal) btnCloseDocModal.addEventListener('click', closeDocModal);
    if (btnDocClose) btnDocClose.addEventListener('click', closeDocModal);
    if (drawerBtnDoc) {
      drawerBtnDoc.addEventListener('click', () => {
        if (typeof window.closeLeftDrawer === 'function') window.closeLeftDrawer();
        openDocModal();
      });
    }

    if (btnCloseAboutModal) btnCloseAboutModal.addEventListener('click', closeAboutModal);
    if (drawerBtnAbout) {
      drawerBtnAbout.addEventListener('click', () => {
        if (typeof window.closeLeftDrawer === 'function') window.closeLeftDrawer();
        openAboutModal();
      });
    }

    // Sub-tab switcher inside Documentation Modal
    const docTabBtns = document.querySelectorAll('.doc-tab-btn[data-doc-tab]');
    docTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-doc-tab');
        docTabBtns.forEach(b => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.doc-tab-pane').forEach(pane => {
          pane.style.display = pane.id === targetId ? 'block' : 'none';
          pane.classList.toggle('active', pane.id === targetId);
        });
      });
    });

    // Schema pill switcher inside Doc Tab 4
    const schemaSubBtns = document.querySelectorAll('.schema-sub-btn[data-schema-target]');
    schemaSubBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-schema-target');
        schemaSubBtns.forEach(b => b.classList.toggle('active', b === btn));
        document.querySelectorAll('.schema-pane').forEach(pane => {
          pane.style.display = pane.id === targetId ? 'block' : 'none';
          pane.classList.toggle('active', pane.id === targetId);
        });
      });
    });

    // Copy Schema Button Listener
    const copySchemaBtns = document.querySelectorAll('.btn-copy-schema');
    copySchemaBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-copy-target');
        const el = document.getElementById(targetId);
        if (el) {
          navigator.clipboard.writeText(el.innerText);
          window.showToast('Schema code payload copied!', 'success');
        }
      });
    });
  });
})();
