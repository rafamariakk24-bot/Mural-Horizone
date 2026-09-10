const storageKey = 'horizonte-avisos';
const sessionKey = 'horizonte-sessao';
const credentials = {
  aluno: { username: 'aluno01', password: '1234', label: 'Aluno' },
  professor: { username: 'professora', password: '5678', label: 'Professora' }
};

const loginScreen = document.querySelector('#login-screen');
const loginForm = document.querySelector('#login-form');
const loginError = document.querySelector('#login-error');
const appShell = document.querySelector('.app-shell');
const noticeList = document.querySelector('#notice-list');
const emptyState = document.querySelector('#empty-state');
const modal = document.querySelector('#notice-modal');
const form = document.querySelector('#notice-form');
const categorySelect = document.querySelector('#notice-category');
const subjectField = document.querySelector('#subject-field');
const subjectInput = document.querySelector('#notice-subject');
const profileDialog = document.querySelector('#profile-dialog');
const classField = document.querySelector('#class-field');
const seriesSelect = document.querySelector('#login-series');
const classSelect = document.querySelector('#login-class');
const imageSizeControl = document.querySelector('#image-size');
const imageSizeValue = document.querySelector('#image-size-value');
const assessmentCategories = ['Prova', 'ENEM', 'Vestibular', 'Simulado'];
const session = JSON.parse(localStorage.getItem(sessionKey) || 'null');

let notices = JSON.parse(localStorage.getItem(storageKey)) || [];
let currentFilter = 'Todos';
let editingNoticeId = null;
let currentRole = session?.role || 'aluno';
let currentUser = session;

const loggedTeacher = currentUser?.role === 'professor'
  ? `${currentUser.label}: ${currentUser.username}`
  : 'Professor responsável';

const defaultNotices = [
  { id: 1, title: 'Bem-vindos ao novo ano letivo!', content: 'Que este seja um ano cheio de descobertas, encontros e muito aprendizado. Estamos felizes em ter vocês de volta.', author: 'Direção da escola', category: 'Importante', date: 'Hoje, 08:15', pinned: true },
  { id: 2, title: 'Inscrições abertas para a feira de ciências', content: 'As equipes podem se inscrever até sexta-feira na secretaria. Consulte o regulamento no mural da sua sala.', author: 'Prof. Marcelo', category: 'Eventos', date: 'Ontem, 16:40', pinned: false },
  { id: 3, title: 'Material para a aula de História', content: 'Não esqueçam de trazer o caderno de atividades e o texto sobre a formação do Brasil na próxima aula.', author: loggedTeacher, category: 'Acadêmico', date: '22 de ago., 11:20', pinned: false },
  { id: 4, title: 'Atividade de Matemática para entregar', content: 'Resolver os exercícios 1 a 10 da página 42 e entregar na próxima aula.', author: loggedTeacher, category: 'Atividade para entregar', date: '21 de ago., 10:00', dueDate: '2026-08-29', pinned: false },
  { id: 5, title: 'Trabalho de Literatura', content: 'Produzir uma análise de uma obra literária e enviar o arquivo em PDF.', author: loggedTeacher, category: 'Trabalho', date: '20 de ago., 09:30', dueDate: '2026-09-05', pinned: false }
];

notices.forEach(notice => {
  if (typeof notice.author === 'string' && notice.author.startsWith('Prof.')) {
    notice.author = loggedTeacher;
  }
});

function saveNotices() {
  localStorage.setItem(storageKey, JSON.stringify(notices));
}

function ensureDefaultNotices() {
  if (!notices.length) {
    notices = defaultNotices.slice();
  }

  if (!notices.some(notice => notice.category === 'Atividade para entregar')) {
    notices.push(defaultNotices[3]);
  }

  if (!notices.some(notice => notice.category === 'Trabalho')) {
    notices.push(defaultNotices[4]);
  }

  notices.forEach(notice => {
    if (['Atividade para entregar', 'Trabalho'].includes(notice.category) && !notice.dueDate) {
      notice.dueDate = '2026-08-29';
    }
  });

  saveNotices();
}

function setAuthenticatedUser(user) {
  localStorage.setItem(sessionKey, JSON.stringify(user));
  currentUser = user;
  document.body.classList.add('authenticated');

  if (loginScreen) {
    loginScreen.hidden = true;
  }

  if (appShell) {
    appShell.hidden = false;
  }

  const userButton = document.querySelector('#logged-user');
  if (userButton) {
    userButton.textContent = `${user.label}: ${user.username}`;
  }

  updateProfile(user);
}

function updateProfile(user) {
  const profileName = document.querySelector('#profile-name');
  const profileUsername = document.querySelector('#profile-username');
  const profileRole = document.querySelector('#profile-role');
  const profileSeries = document.querySelector('#profile-series');
  const profileClass = document.querySelector('#profile-class');
  const profileAvatar = document.querySelector('#profile-avatar');
  const profilePermissions = document.querySelector('#profile-permissions');

  if (!profileName || !profileUsername || !profileRole || !profileSeries || !profileClass || !profileAvatar || !profilePermissions) return;

  profileName.textContent = user.label;
  profileUsername.textContent = `@${user.username}`;
  profileRole.textContent = user.role === 'professor' ? 'Professora' : 'Aluno';
  profileSeries.textContent = user.role === 'aluno' ? (user.serie || 'Não informada') : 'Não se aplica';
  profileClass.textContent = user.role === 'aluno' ? (user.turma || 'Não informada') : 'Não se aplica';
  profileAvatar.textContent = user.role === 'professor' ? 'P' : 'A';
  profilePermissions.textContent = user.role === 'professor'
    ? 'Você pode publicar, editar e excluir avisos e atividades.'
    : 'Você pode visualizar avisos, provas, atividades e anexos.';
}

function escapeHtml(value) {
  const element = document.createElement('div');
  element.textContent = value;
  return element.innerHTML;
}

function subjectMarkup(notice) {
  if (!notice.subject || !assessmentCategories.includes(notice.category)) return '';
  return `<div class="notice-subject"><span>Assunto da avaliação</span><strong>${escapeHtml(notice.subject)}</strong></div>`;
}

function attachmentMarkup(attachment) {
  if (!attachment) return '';

  const safeData = escapeHtml(attachment.data);
  const safeName = escapeHtml(attachment.name);

  if (attachment.type.startsWith('image/')) {
    return `<a class="attachment-image-link" href="${safeData}" target="_blank" rel="noopener"><img class="attachment-image" src="${safeData}" alt="${safeName}"></a><span class="attachment-name">${safeName}</span>`;
  }

  return `<a class="attachment-file" href="${safeData}" target="_blank" rel="noopener">▣ <span>${safeName}</span><b>Abrir PDF</b></a>`;
}

function deadlineMarkup(notice) {
  if (!notice.dueDate) return '';

  const expired = new Date(`${notice.dueDate}T23:59:59`) < new Date();
  const formattedDate = new Date(`${notice.dueDate}T12:00:00`).toLocaleDateString('pt-BR');

  if (!expired) {
    return `<div class="deadline active"><span>▣ Prazo de entrega</span><strong>${formattedDate}</strong></div>`;
  }

  const guidance = currentRole === 'professor'
    ? 'Edite este aviso para colocar um novo prazo.'
    : 'Fale com o professor para ele colocar um novo prazo.';

  return `<div class="deadline expired"><span>! Prazo encerrado em ${formattedDate}</span><strong>${guidance}</strong></div>`;
}

function renderNotices() {
  if (!noticeList || !emptyState) return;

  const visibleNotices = notices
    .filter(notice => currentFilter === 'Todos' || notice.category === currentFilter)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  noticeList.innerHTML = visibleNotices.map((notice, index) => `
    <article class="notice-card ${notice.pinned ? 'pinned' : ''}" style="animation-delay:${index * 60}ms">
      <div class="notice-meta"><span class="category">${notice.pinned ? '★ fixado' : notice.category}</span><span>${notice.date}</span></div>
      <h3>${escapeHtml(notice.title)}</h3>
      <p>${escapeHtml(notice.content)}</p>
      ${subjectMarkup(notice)}
      ${deadlineMarkup(notice)}
      ${attachmentMarkup(notice.attachment)}
      <div class="notice-meta" style="margin-top:18px">
        <span>Por ${escapeHtml(notice.author)}</span>
        ${currentRole === 'professor' ? `<span class="card-actions"><button class="edit-button" type="button" data-edit="${notice.id}" aria-label="Editar aviso" title="Editar aviso">✎</button><button class="delete-button" type="button" data-delete="${notice.id}" aria-label="Excluir aviso" title="Excluir aviso">×</button></span>` : ''}
      </div>
    </article>
  `).join('');

  emptyState.hidden = visibleNotices.length > 0;

  const allCount = document.querySelector('#all-count');
  const openModalButton = document.querySelector('#open-modal');
  const resultLabel = document.querySelector('#result-label');

  if (allCount) allCount.textContent = notices.length;
  if (openModalButton) openModalButton.hidden = false;
  if (resultLabel) resultLabel.textContent = currentFilter === 'Todos' ? 'todos os avisos' : `categoria: ${currentFilter.toLowerCase()}`;
}

function updateSubjectField() {
  if (!categorySelect || !subjectField || !subjectInput) return;

  const isAssessment = assessmentCategories.includes(categorySelect.value);
  subjectField.hidden = !isAssessment;
  subjectInput.required = isAssessment;
}

function getCurrentAuthor() {
  return currentUser ? `${currentUser.label}: ${currentUser.username}` : 'Usuário não identificado';
}

function openNewNotice() {
  if (!form || !modal) return;

  editingNoticeId = null;
  form.reset();
  updateSubjectField();
  document.querySelector('#notice-author').value = getCurrentAuthor();
  document.querySelector('#modal-eyebrow').textContent = 'novo comunicado';
  document.querySelector('#modal-title').textContent = 'Publicar um aviso';
  document.querySelector('#submit-notice').firstChild.textContent = 'Publicar aviso ';
  modal.showModal();
  document.querySelector('#notice-title').focus();
}

function updateClassField() {
  if (!classField || !seriesSelect || !classSelect) return;

  const isStudent = document.querySelector('#login-role')?.value === 'aluno';
  classField.hidden = !isStudent;
  seriesSelect.required = isStudent;
  classSelect.required = isStudent;
}

function attachEventHandlers() {
  if (imageSizeControl && imageSizeValue) {
    const savedImageSize = localStorage.getItem('horizonte-imagem-tamanho-v3') || '80';
    imageSizeControl.value = savedImageSize;
    imageSizeValue.value = `${savedImageSize}%`;
    document.documentElement.style.setProperty('--login-image-size', `${savedImageSize}%`);

    imageSizeControl.addEventListener('input', () => {
      const imageSize = imageSizeControl.value;
      imageSizeValue.value = `${imageSize}%`;
      document.documentElement.style.setProperty('--login-image-size', `${imageSize}%`);
      localStorage.setItem('horizonte-imagem-tamanho-v3', imageSize);
    });
  }

  if (session && credentials[session.role] && session.username === credentials[session.role].username) {
    setAuthenticatedUser(session);
  }

  if (loginForm) {
    updateClassField();
    document.querySelector('#login-role')?.addEventListener('change', updateClassField);

    loginForm.addEventListener('submit', event => {
      event.preventDefault();

      const role = document.querySelector('#login-role').value;
      const serie = role === 'aluno' ? document.querySelector('#login-series').value : '';
      const turma = role === 'aluno' ? document.querySelector('#login-class').value : '';
      const username = document.querySelector('#login-user').value.trim().toLowerCase();
      const password = document.querySelector('#login-password').value;
      const account = credentials[role];

      if (username !== account.username || password !== account.password) {
        loginError.textContent = 'Usuário ou senha incorretos para este perfil.';
        return;
      }

      loginError.textContent = '';
      setAuthenticatedUser({ role, serie, turma, username, label: account.label });
      currentRole = role;
      window.location.href = 'rafa1.html';
    });
  }

  const logoutButton = document.querySelector('#logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', () => {
      localStorage.removeItem(sessionKey);
      window.location.href = 'rafa.html';
    });
  }

  const filterTabs = document.querySelectorAll('.filter-tab');
  filterTabs.forEach(button => {
    button.addEventListener('click', () => {
      currentFilter = button.dataset.filter;
      document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.toggle('active', tab === button));
      renderNotices();
    });
  });

  if (categorySelect) {
    categorySelect.addEventListener('change', updateSubjectField);
  }

  const openModalButton = document.querySelector('#open-modal');
  if (openModalButton) {
    openModalButton.addEventListener('click', () => {
      openNewNotice();
    });
  }

  if (modal) {
    document.querySelector('#close-modal')?.addEventListener('click', () => modal.close());
    modal.addEventListener('click', event => {
      if (event.target === modal) modal.close();
    });
  }

  if (!form) {
    return;
  }

  form.addEventListener('submit', event => {
    event.preventDefault();

    const data = new FormData(form);
    const selectedFile = data.get('attachment');

    if (selectedFile && selectedFile.size > 2 * 1024 * 1024) {
      window.alert('O arquivo deve ter no máximo 2 MB.');
      return;
    }

    const finishSave = attachment => {
      const existingNotice = editingNoticeId ? notices.find(item => item.id === editingNoticeId) : null;
      const noticeData = {
        title: data.get('title'),
        content: data.get('content'),
        author: editingNoticeId ? data.get('author') : getCurrentAuthor(),
        category: data.get('category'),
        subject: data.get('subject')?.trim() || '',
        dueDate: data.get('dueDate') || existingNotice?.dueDate,
        pinned: data.has('pinned')
      };

      if (attachment) noticeData.attachment = attachment;

      if (editingNoticeId) {
        const notice = notices.find(item => item.id === editingNoticeId);
        Object.assign(notice, noticeData, { date: 'Editado agora' });
      } else {
        notices.unshift({ id: Date.now(), ...noticeData, date: 'Agora' });
      }

      saveNotices();
      renderNotices();
      form.reset();
      document.querySelector('#notice-author').value = getCurrentAuthor();
      editingNoticeId = null;
      modal.close();
    };

    if (selectedFile && selectedFile.size) {
      const reader = new FileReader();
      reader.onload = () => finishSave({
        name: selectedFile.name,
        type: selectedFile.type || 'application/pdf',
        data: reader.result
      });
      reader.readAsDataURL(selectedFile);
      return;
    }

    finishSave(editingNoticeId ? notices.find(item => item.id === editingNoticeId).attachment : null);
  });

  if (noticeList) {
    noticeList.addEventListener('click', event => {
      if (currentRole !== 'professor') return;

      const editButton = event.target.closest('[data-edit]');
      if (editButton) {
        const notice = notices.find(item => String(item.id) === editButton.dataset.edit);
        if (!notice) return;

        editingNoticeId = notice.id;
        document.querySelector('#notice-title').value = notice.title;
        document.querySelector('#notice-content').value = notice.content;
        document.querySelector('#notice-author').value = notice.author;
        document.querySelector('#notice-category').value = notice.category;
        document.querySelector('#notice-subject').value = notice.subject || '';
        updateSubjectField();
        document.querySelector('#notice-due-date').value = notice.dueDate || '';
        document.querySelector('[name="pinned"]').checked = notice.pinned;
        document.querySelector('#modal-eyebrow').textContent = 'alterar comunicado';
        document.querySelector('#modal-title').textContent = 'Editar aviso';
        document.querySelector('#submit-notice').firstChild.textContent = 'Salvar alterações ';
        modal.showModal();
        document.querySelector('#notice-title').focus();
        return;
      }

      const button = event.target.closest('[data-delete]');
      if (!button || !window.confirm('Excluir este aviso?')) return;

      notices = notices.filter(notice => String(notice.id) !== button.dataset.delete);
      saveNotices();
      renderNotices();
    });
  }

  const loggedUser = document.querySelector('#logged-user');
  if (loggedUser) {
    loggedUser.addEventListener('click', () => profileDialog.showModal());
  }

  const closeProfileButton = document.querySelector('#close-profile');
  if (closeProfileButton) {
    closeProfileButton.addEventListener('click', () => profileDialog.close());
  }

  if (profileDialog) {
    profileDialog.addEventListener('click', event => {
      if (event.target === profileDialog) profileDialog.close();
    });
  }
}

ensureDefaultNotices();
attachEventHandlers();

if (noticeList && emptyState) {
  renderNotices();
}

