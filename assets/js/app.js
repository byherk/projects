// Trang Projects: đọc apps.json, vẽ thẻ, tìm kiếm và lọc theo danh mục.
// Thêm dự án mới: chỉ sửa apps.json. Để "url" rỗng thì thẻ hiện "Coming soon" và không bấm được.

const ICONS = 'assets/icons.svg';
const ALL = 'All';

const state = { apps: [], category: ALL, query: '' };

const $ = (selector) => document.querySelector(selector);
const els = {
	search: $('#search'),
	clear: $('.search .clear'),
	filters: $('.filters'),
	selected: $('#selected'),
	all: $('#all'),
	allTitle: $('#all-title'),
	empty: $('#empty'),
	template: $('#card-template'),
	themeToggle: $('.theme-toggle'),
};

// Tìm không phân biệt dấu: "hoa don" khớp "hóa đơn".
const normalize = (text) =>
	text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/đ/g, 'd')
		.replace(/Đ/g, 'D')
		.toLowerCase()
		.trim();

function createCard(app, index) {
	const item = els.template.content.firstElementChild.cloneNode(true);
	const card = item.querySelector('.card');
	card.style.setProperty('--i', index);
	item.querySelector('use').setAttribute('href', `${ICONS}#${app.icon || 'article'}`);
	item.querySelector('.card-category').textContent = app.category;
	item.querySelector('.card-description').textContent = app.description;

	const title = item.querySelector('.card-title');
	if (app.url) {
		const link = document.createElement('a');
		link.href = app.url;
		link.textContent = `${app.title} ↗`;
		title.append(link);
		card.classList.add('is-link');
		item.querySelector('.card-status').remove();
	} else {
		title.textContent = app.title;
	}
	return item;
}

function fillGrid(section, apps, animate) {
	const grid = section.querySelector('.grid');
	grid.replaceChildren(...apps.map(createCard));
	grid.classList.toggle('is-entering', animate);
	section.hidden = apps.length === 0;
}

function render(animate = false) {
	const q = normalize(state.query);
	const filtering = q !== '' || state.category !== ALL;
	const matches = state.apps.filter(
		(app) =>
			(state.category === ALL || app.category === state.category) &&
			(!q || normalize(`${app.title} ${app.description} ${app.category}`).includes(q)),
	);

	if (filtering) {
		// Đang lọc: một danh sách duy nhất, tiêu đề chỉ cho trình đọc màn hình.
		fillGrid(els.selected, [], false);
		fillGrid(els.all, matches, false);
		els.allTitle.textContent = 'Results';
		els.allTitle.classList.add('sr-only');
	} else {
		fillGrid(els.selected, matches.filter((app) => app.featured), animate);
		fillGrid(els.all, matches.filter((app) => !app.featured), animate);
		els.allTitle.textContent = 'More projects';
		els.allTitle.classList.remove('sr-only');
	}

	els.empty.hidden = matches.length > 0;
	if (matches.length === 0) {
		els.empty.querySelector('p').textContent = state.query.trim()
			? `No results for "${state.query.trim()}". Try a shorter keyword, or show all projects.`
			: 'Nothing here yet.';
	}
}

function renderFilters() {
	const categories = [ALL, ...new Set(state.apps.map((app) => app.category))];
	els.filters.replaceChildren(
		...categories.map((category) => {
			const li = document.createElement('li');
			const button = document.createElement('button');
			button.type = 'button';
			button.textContent = category;
			button.dataset.category = category;
			button.setAttribute('aria-pressed', String(category === state.category));
			if (category !== ALL) button.lang = 'vi';
			li.append(button);
			return li;
		}),
	);
}

function setCategory(category) {
	state.category = category;
	for (const button of els.filters.querySelectorAll('button')) {
		button.setAttribute('aria-pressed', String(button.dataset.category === category));
	}
	render();
}

function setQuery(query) {
	state.query = query;
	els.search.value = query;
	els.clear.hidden = query === '';
	render();
}

function updateThemeLabel() {
	const isDark = document.documentElement.dataset.theme === 'dark';
	const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';
	els.themeToggle.setAttribute('aria-label', label);
	els.themeToggle.title = isDark ? 'Light theme' : 'Dark theme';
}

els.themeToggle.addEventListener('click', () => {
	const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
	document.documentElement.dataset.theme = next;
	try {
		localStorage.setItem('starlight-theme', next);
	} catch (e) {
		// Trình duyệt chặn lưu trữ: vẫn đổi được trong phiên này.
	}
	updateThemeLabel();
});

els.search.addEventListener('input', (event) => setQuery(event.target.value));
els.search.addEventListener('keydown', (event) => {
	if (event.key === 'Escape') setQuery('');
});
els.clear.addEventListener('click', () => {
	setQuery('');
	els.search.focus();
});
els.filters.addEventListener('click', (event) => {
	const button = event.target.closest('button');
	if (button) setCategory(button.dataset.category);
});
els.empty.querySelector('button').addEventListener('click', () => {
	state.category = ALL;
	renderFilters();
	setQuery('');
});

async function init() {
	updateThemeLabel();
	try {
		const response = await fetch('apps.json');
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		state.apps = await response.json();
	} catch (error) {
		console.error('Không đọc được apps.json:', error);
		els.selected.hidden = true;
		els.all.hidden = true;
		els.empty.hidden = false;
		els.empty.querySelector('p').textContent = "This part didn't load. Try refreshing the page.";
		els.empty.querySelector('button').hidden = true;
		return;
	}
	renderFilters();
	render(!matchMedia('(prefers-reduced-motion: reduce)').matches);
}

init();
