/**
 * Lynislens Enterprise Suite — Authentication & Master Access Controller
 * Version 2.0.0
 */

(function() {
  const DEFAULT_MASTER_USER = 'admin';
  const DEFAULT_MASTER_PASS = 'lynislens';

  function getMasterUsername() {
    return localStorage.getItem('lynislens_master_username') || DEFAULT_MASTER_USER;
  }

  function getMasterPassword() {
    return localStorage.getItem('lynislens_master_password') || DEFAULT_MASTER_PASS;
  }

  function setMasterPassword(newPassword) {
    localStorage.setItem('lynislens_master_password', newPassword);
  }

  function updateUserProfileDisplay() {
    const profileJson = localStorage.getItem('lynislens_profile');
    let name = 'SecOps Auditor';
    let role = 'Enterprise Security Lead';
    
    if (profileJson) {
      try {
        const profile = JSON.parse(profileJson);
        if (profile.auditorName) name = profile.auditorName;
        if (profile.role) role = profile.role;
      } catch (e) {}
    }

    const userProfileName = document.getElementById('userProfileName');
    const userProfileRole = document.getElementById('userProfileRole');
    if (userProfileName) userProfileName.textContent = name;
    if (userProfileRole) userProfileRole.textContent = role;

    const dropdownUserName = document.getElementById('dropdownUserName');
    const dropdownUserRole = document.getElementById('dropdownUserRole');
    const dropdownAvatar = document.getElementById('dropdownAvatar');

    if (dropdownUserName) dropdownUserName.textContent = name;
    if (dropdownUserRole) {
      dropdownUserRole.innerHTML = `
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"></circle></svg>
        ${window.escapeHtml(role)}
      `;
    }
    if (dropdownAvatar) {
      const parts = name.trim().split(/\s+/).filter(Boolean);
      let initials = 'SA';
      if (parts.length >= 2) initials = (parts[0][0] + parts[1][0]).toUpperCase();
      else if (parts.length === 1) initials = parts[0].substring(0, 2).toUpperCase();
      dropdownAvatar.textContent = initials;
    }
  }

  function checkAuth() {
    const isAuth = localStorage.getItem('lynislens_owner_auth');
    updateUserProfileDisplay();

    const authOverlay = document.getElementById('authOverlay');
    if (!isAuth) {
      if (authOverlay) authOverlay.classList.remove('hidden');
    } else {
      if (authOverlay) authOverlay.classList.add('hidden');
      if (typeof window.bootstrapApp === 'function') {
        window.bootstrapApp();
      }
    }
  }

  function handleLogout() {
    localStorage.removeItem('lynislens_owner_auth');
    const authOverlay = document.getElementById('authOverlay');
    if (authOverlay) authOverlay.classList.remove('hidden');
    window.showToast("Signed out of Lynislens Enterprise.", "info");
  }

  window.checkAuth = checkAuth;
  window.handleLogout = handleLogout;
  window.getMasterUsername = getMasterUsername;
  window.getMasterPassword = getMasterPassword;
  window.setMasterPassword = setMasterPassword;
  window.updateUserProfileDisplay = updateUserProfileDisplay;

  document.addEventListener('DOMContentLoaded', () => {
    const authOverlay = document.getElementById('authOverlay');
    const loginForm = document.getElementById('loginForm');
    const ownerPasswordInput = document.getElementById('ownerPassword');
    const loginAuditorName = document.getElementById('loginAuditorName');
    const btnMenuLogout = document.getElementById('btnMenuLogout');
    const profilePill = document.getElementById('profilePill');
    const profileDropdownMenu = document.getElementById('profileDropdownMenu');
    const dropdownGoSettings = document.getElementById('dropdownGoSettings');
    const dropdownChangePassword = document.getElementById('dropdownChangePassword');
    const dropdownGoSystems = document.getElementById('dropdownGoSystems');
    const dropdownGoHistory = document.getElementById('dropdownGoHistory');
    const dropdownLogout = document.getElementById('dropdownLogout');

    function closeProfileDropdown() {
      if (profileDropdownMenu) profileDropdownMenu.style.display = 'none';
      if (profilePill) {
        profilePill.classList.remove('active');
        profilePill.setAttribute('aria-expanded', 'false');
      }
    }

    window.closeProfileDropdown = closeProfileDropdown;

    if (profilePill && profileDropdownMenu) {
      profilePill.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = profileDropdownMenu.style.display === 'block';
        profileDropdownMenu.style.display = isOpen ? 'none' : 'block';
        profilePill.classList.toggle('active', !isOpen);
        profilePill.setAttribute('aria-expanded', String(!isOpen));
      });

      profilePill.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          profilePill.click();
        } else if (e.key === 'Escape') {
          closeProfileDropdown();
        }
      });

      document.addEventListener('click', (e) => {
        if (!profilePill.contains(e.target) && !profileDropdownMenu.contains(e.target)) {
          closeProfileDropdown();
        }
      });
    }

    if (dropdownGoSettings) {
      dropdownGoSettings.addEventListener('click', () => {
        closeProfileDropdown();
        if (typeof window.switchMainTab === 'function') window.switchMainTab('tabSettings');
      });
    }
    if (dropdownGoSystems) {
      dropdownGoSystems.addEventListener('click', () => {
        closeProfileDropdown();
        if (typeof window.switchMainTab === 'function') window.switchMainTab('tabSystems');
      });
    }
    if (dropdownGoHistory) {
      dropdownGoHistory.addEventListener('click', () => {
        closeProfileDropdown();
        if (typeof window.switchMainTab === 'function') window.switchMainTab('tabReporting');
      });
    }
    if (dropdownLogout) {
      dropdownLogout.addEventListener('click', () => {
        closeProfileDropdown();
        handleLogout();
      });
    }

    // Modal: Change Password
    const changePasswordModal = document.getElementById('changePasswordModal');
    const changePasswordForm = document.getElementById('changePasswordForm');
    const btnCloseChangePasswordModal = document.getElementById('btnCloseChangePasswordModal');
    const btnCancelChangePassword = document.getElementById('btnCancelChangePassword');
    const changePasswordError = document.getElementById('changePasswordError');
    const currentMasterPassword = document.getElementById('currentMasterPassword');
    const newMasterPassword = document.getElementById('newMasterPassword');
    const confirmMasterPassword = document.getElementById('confirmMasterPassword');

    function openChangePasswordModal() {
      closeProfileDropdown();
      if (changePasswordForm) changePasswordForm.reset();
      if (changePasswordError) changePasswordError.style.display = 'none';
      if (changePasswordModal) changePasswordModal.classList.add('active');
      setTimeout(() => {
        if (currentMasterPassword) currentMasterPassword.focus();
      }, 120);
    }

    function closeChangePasswordModal() {
      if (changePasswordModal) changePasswordModal.classList.remove('active');
    }

    window.openChangePasswordModal = openChangePasswordModal;
    window.closeChangePasswordModal = closeChangePasswordModal;

    if (dropdownChangePassword) {
      dropdownChangePassword.addEventListener('click', openChangePasswordModal);
    }
    if (btnCloseChangePasswordModal) {
      btnCloseChangePasswordModal.addEventListener('click', closeChangePasswordModal);
    }
    if (btnCancelChangePassword) {
      btnCancelChangePassword.addEventListener('click', closeChangePasswordModal);
    }

    if (changePasswordForm) {
      changePasswordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const curr = currentMasterPassword ? currentMasterPassword.value.trim() : '';
        const next = newMasterPassword ? newMasterPassword.value.trim() : '';
        const conf = confirmMasterPassword ? confirmMasterPassword.value.trim() : '';

        const validPass = getMasterPassword();

        if (curr !== validPass) {
          if (changePasswordError) {
            changePasswordError.textContent = 'Current master password is incorrect.';
            changePasswordError.style.display = 'block';
          }
          window.showToast('Current master password is incorrect.', 'error');
          return;
        }
        if (next.length < 6) {
          if (changePasswordError) {
            changePasswordError.textContent = 'New password must be at least 6 characters.';
            changePasswordError.style.display = 'block';
          }
          window.showToast('New password must be at least 6 characters.', 'error');
          return;
        }
        if (next !== conf) {
          if (changePasswordError) {
            changePasswordError.textContent = 'New passwords do not match.';
            changePasswordError.style.display = 'block';
          }
          window.showToast('New passwords do not match.', 'error');
          return;
        }

        setMasterPassword(next);
        closeChangePasswordModal();
        window.showToast('Master Access Password updated successfully!', 'success');
      });
    }

    // Login Form Submit
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const enteredUser = loginAuditorName ? loginAuditorName.value.trim() : '';
        const enteredPwd = ownerPasswordInput ? ownerPasswordInput.value.trim() : '';
        const authErrorMsg = document.getElementById('authErrorMessage');

        const validUser = getMasterUsername();
        const validPass = getMasterPassword();

        if (enteredUser !== validUser || enteredPwd !== validPass) {
          if (authErrorMsg) {
            authErrorMsg.textContent = 'Invalid credentials. Default: username "admin", password "lynislens"';
            authErrorMsg.style.display = 'block';
          }
          window.showToast('Invalid credentials. Check username & master password.', 'error');
          return;
        }

        if (authErrorMsg) authErrorMsg.style.display = 'none';
        localStorage.setItem('lynislens_owner_auth', 'true');
        
        const existingProfile = localStorage.getItem('lynislens_profile');
        if (!existingProfile) {
          localStorage.setItem('lynislens_profile', JSON.stringify({
            auditorName: enteredUser === 'admin' ? 'SecOps Auditor' : enteredUser,
            role: 'Enterprise Security Lead',
            company: 'Acme Enterprise Security',
            benchmark: 'CIS Linux Benchmark (Level 2 Server)'
          }));
        } else {
          try {
            const prof = JSON.parse(existingProfile);
            if (enteredUser !== 'admin') prof.auditorName = enteredUser;
            localStorage.setItem('lynislens_profile', JSON.stringify(prof));
          } catch (err) {}
        }
        
        if (authOverlay) authOverlay.classList.add('hidden');
        window.showToast('Authenticated as Administrator. Welcome to Lynislens!', 'success');
        checkAuth();
      });
    }

    if (btnMenuLogout) btnMenuLogout.addEventListener('click', handleLogout);
    
    const drawerBtnLogout = document.getElementById('drawerBtnLogout');
    if (drawerBtnLogout) {
      drawerBtnLogout.addEventListener('click', () => {
        if (typeof window.closeLeftDrawer === 'function') window.closeLeftDrawer();
        handleLogout();
      });
    }

    // Initial check
    checkAuth();
  });
})();
