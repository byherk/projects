// Trang Projects: đọc apps.json, vẽ thẻ, tìm kiếm, lọc theo danh mục, đổi ngôn ngữ VI/EN.
//
// apps.json có dạng { "categories": {...}, "apps": [...] }.
// - categories: khóa danh mục → nhãn, ví dụ "ai": { "vi": "Làm việc với AI", "en": "Working with AI" }.
// - apps: mỗi mục gồm id, title, description, category (khóa trong categories), lang (các ngôn ngữ dự án được viết, ví dụ ["vi"]),
//   icon, featured, url.
// - lang quyết định dự án hiện ở bản ngôn ngữ nào: chỉ hiện khi lang chứa ngôn ngữ giao diện đang chọn. Chủ đề không còn dự án
//   thì ẩn khỏi bộ lọc. Mục không khai báo lang được coi là dùng được ở mọi ngôn ngữ. Nếu lang chỉ có một phần tử,
//   link của thẻ được đặt hreflang theo phần tử đó.
// - title và description: chuỗi (dùng chung cho mọi ngôn ngữ) hoặc { vi, en }; hàm pick() chọn đúng bản.
// Thêm dự án mới: thêm một mục vào apps. Để "url" rỗng thì thẻ hiện "Sắp có" và không bấm được.
//
// Ngôn ngữ giao diện được chọn bởi script nhỏ trong <head> (URL ?lang, rồi 'byherk-lang', rồi ngôn ngữ trình duyệt)
// và ghi vào html lang. File này chỉ đọc lại giá trị đó. Chữ giao diện nằm trong STRINGS.

const STRINGS = {
	vi: {
		pageTitle: 'Dự án · byherk',
		metaDescription: 'Công cụ nhỏ và ứng dụng web cho việc hằng ngày.',
		skipLink: 'Chuyển đến nội dung chính',
		intro: 'Tuyển tập các công cụ và ứng dụng web hữu ích cho cuộc sống hàng ngày.',
		themeToDark: 'Chuyển sang chế độ Tối',
		themeToLight: 'Chuyển sang chế độ Sáng',
		themeDarkTip: 'Chế độ Tối',
		themeLightTip: 'Chế độ Sáng',
		searchLabel: 'Tìm kiếm',
		searchPlaceholder: 'Tìm dự án',
		clear: 'Xóa',
		categories: 'Danh mục',
		all: 'Tất cả',
		selected: 'Dự án tiêu biểu',
		more: 'Dự án khác',
		results: 'Kết quả',
		noResults: (q) => `Không có dự án nào khớp với “${q}”. Thử từ khóa ngắn hơn, hoặc xem tất cả dự án.`,
		empty: 'Chưa có dự án nào.',
		showAll: 'Xem tất cả',
		loadError: 'Phần này chưa tải được. Bạn thử tải lại trang nhé.',
		comingSoon: 'Sắp có',
		external: '(trang ngoài)',
		langName: 'Tiếng Việt',
	},
	en: {
		pageTitle: 'Projects · byherk',
		metaDescription: 'Small tools and web apps for everyday tasks.',
		skipLink: 'Skip to main content',
		intro: 'Useful tools and web apps for everyday life.',
		themeToDark: 'Switch to dark theme',
		themeToLight: 'Switch to light theme',
		themeDarkTip: 'Dark theme',
		themeLightTip: 'Light theme',
		searchLabel: 'Search',
		searchPlaceholder: 'Search projects',
		clear: 'Clear',
		categories: 'Categories',
		all: 'All',
		selected: 'Selected projects',
		more: 'More projects',
		results: 'Results',
		noResults: (q) => `No results for “${q}”. Try a shorter keyword, or show all projects.`,
		empty: 'Nothing here yet.',
		showAll: 'Show all',
		loadError: 'This part didn’t load. Try refreshing the page.',
		comingSoon: 'Coming soon',
		external: '(external site)',
		langName: 'English',
	},
};

const ICONS = 'assets/icons.svg';
const ALL = 'all';
const LANG_KEY = 'byherk-lang';
// Ít dự án thì tìm kiếm và lọc chỉ thêm rối: dưới ngưỡng này khối .controls bị ẩn.
const MIN_PROJECTS_FOR_CONTROLS = 6;

let lang = STRINGS[document.documentElement.lang] ? document.documentElement.lang : 'vi';
const state = { categories: {}, apps: [], category: ALL, query: '', ready: false, failed: false };

const $ = (selector) => document.querySelector(selector);
const els = {
	controls: $('.controls'),
	search: $('#search'),
	clear: $('.search .clear'),
	filters: $('.filters'),
	selected: $('#selected'),
	all: $('#all'),
	allTitle: $('#all-title'),
	empty: $('#empty'),
	template: $('#card-template'),
	themeToggle: $('.theme-toggle'),
	langToggle: $('.lang-toggle'),
};

const t = () => STRINGS[lang];

// Chuỗi dùng chung, hoặc { vi, en }: lấy bản của ngôn ngữ đang hiện, thiếu thì lấy bản vi.
const pick = (value) => value?.[lang] ?? value?.vi ?? value;

const categoryLabel = (key) => pick(state.categories[key]) ?? key;

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
	item.querySelector('use').setAttribute('href', `${ICONS}#${app.icon || 'list-checks'}`);
	item.querySelector('.card-category').textContent = categoryLabel(app.category);
	item.querySelector('.card-description').textContent = pick(app.description);

	const title = item.querySelector('.card-title');
	const titleText = pick(app.title);
	if (app.url) {
		const link = document.createElement('a');
		link.href = app.url;
		if (app.lang?.length === 1) link.hreflang = app.lang[0];
		link.append(titleText);
		// Chỉ link ra trang khác mới có mũi tên (ẩn với trình đọc màn hình, đã có chữ thay thế); link nội bộ thì không.
		if (/^https?:/.test(app.url)) {
			const arrow = document.createElement('span');
			arrow.setAttribute('aria-hidden', 'true');
			arrow.textContent = '↗';
			const note = document.createElement('span');
			note.className = 'sr-only';
			note.textContent = t().external;
			link.append(' ', arrow, ' ', note);
		}
		title.append(link);
		card.classList.add('is-link');
		item.querySelector('.card-status').remove();
	} else {
		title.textContent = titleText;
		item.querySelector('.card-status').textContent = t().comingSoon;
	}
	return item;
}

// Dự án hiện ra ở ngôn ngữ đang chọn: lang phải chứa ngôn ngữ đó (không khai báo lang thì hiện ở mọi ngôn ngữ).
const visibleApps = () => state.apps.filter((app) => !app.lang?.length || app.lang.includes(lang));

// Tìm kiếm và lọc chỉ hiện khi đủ dự án; đếm theo số dự án đang hiện ra, và bỏ bộ lọc nếu chủ đề đã chọn không còn dự án.
function updateControls() {
	const apps = visibleApps();
	els.controls.hidden = apps.length < MIN_PROJECTS_FOR_CONTROLS;
	if (state.category !== ALL && !apps.some((app) => app.category === state.category)) state.category = ALL;
}

function fillGrid(section, apps, animate) {
	const grid = section.querySelector('.grid');
	grid.replaceChildren(...apps.map(createCard));
	grid.classList.toggle('is-entering', animate);
	section.hidden = apps.length === 0;
}

const isFiltering = () => normalize(state.query) !== '' || state.category !== ALL;

function updateAllTitle() {
	const filtering = isFiltering();
	els.allTitle.textContent = filtering ? t().results : t().more;
	els.allTitle.classList.toggle('sr-only', filtering);
}

function render(animate = false) {
	const q = normalize(state.query);
	const filtering = isFiltering();
	const matches = visibleApps().filter(
		(app) =>
			(state.category === ALL || app.category === state.category) &&
			(!q || normalize(`${pick(app.title)} ${pick(app.description)} ${categoryLabel(app.category)}`).includes(q)),
	);

	if (filtering) {
		// Đang lọc: một danh sách duy nhất, tiêu đề chỉ cho trình đọc màn hình.
		fillGrid(els.selected, [], false);
		fillGrid(els.all, matches, false);
	} else {
		fillGrid(els.selected, matches.filter((app) => app.featured), animate);
		fillGrid(els.all, matches.filter((app) => !app.featured), animate);
	}
	updateAllTitle();

	els.empty.hidden = matches.length > 0;
	els.empty.querySelector('button').hidden = !filtering;
	if (matches.length === 0) {
		els.empty.querySelector('p').textContent = state.query.trim() ? t().noResults(state.query.trim()) : t().empty;
	}
}

function renderFilters() {
	const keys = [ALL, ...new Set(visibleApps().map((app) => app.category))];
	els.filters.replaceChildren(
		...keys.map((key) => {
			const li = document.createElement('li');
			const button = document.createElement('button');
			button.type = 'button';
			button.textContent = key === ALL ? t().all : categoryLabel(key);
			button.dataset.category = key;
			button.setAttribute('aria-pressed', String(key === state.category));
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
	els.themeToggle.setAttribute('aria-label', isDark ? t().themeToLight : t().themeToDark);
	els.themeToggle.title = isDark ? t().themeLightTip : t().themeDarkTip;
}

// Nút ngôn ngữ hiện ngôn ngữ ĐÍCH: đang VI thì "EN" (English), đang EN thì "VI" (Tiếng Việt).
const otherLang = () => (lang === 'vi' ? 'en' : 'vi');

function updateLangButton() {
	const next = otherLang();
	const name = STRINGS[next].langName;
	els.langToggle.textContent = next.toUpperCase();
	els.langToggle.lang = next;
	els.langToggle.setAttribute('aria-label', name);
	els.langToggle.title = name;
}

function showLoadError() {
	els.selected.hidden = true;
	els.all.hidden = true;
	els.empty.hidden = false;
	els.empty.querySelector('p').textContent = t().loadError;
	els.empty.querySelector('button').hidden = true;
}

// Áp chữ tĩnh của trang theo ngôn ngữ đang chọn: html lang, tiêu đề, mô tả và mọi phần tử có data-i18n*.
function applyStrings() {
	const s = t();
	document.documentElement.lang = lang;
	document.title = s.pageTitle;
	$('meta[name="description"]').setAttribute('content', s.metaDescription);
	for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = s[el.dataset.i18n];
	for (const attr of ['placeholder', 'aria-label', 'title']) {
		for (const el of document.querySelectorAll(`[data-i18n-${attr}]`)) {
			el.setAttribute(attr, s[el.getAttribute(`data-i18n-${attr}`)]);
		}
	}
	updateAllTitle();
	updateThemeLabel();
	updateLangButton();
}

// Đổi ngôn ngữ không tải lại trang; giữ từ khóa tìm, bộ lọc và vị trí cuộn.
function setLang(next) {
	if (!STRINGS[next]) return;
	lang = next;
	try {
		localStorage.setItem(LANG_KEY, next);
	} catch (e) {
		// Trình duyệt chặn lưu trữ: vẫn đổi được trong phiên này.
	}
	const url = new URL(location.href);
	url.searchParams.set('lang', next);
	history.replaceState(history.state, '', url);
	applyStrings();
	if (state.failed) showLoadError();
	else if (state.ready) {
		updateControls();
		renderFilters();
		render(false);
	}
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

els.langToggle.addEventListener('click', () => setLang(otherLang()));

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
	// Áp chữ ngay, trước khi tải dữ liệu, để không nháy chữ VI khi đang ở EN.
	applyStrings();
	try {
		const response = await fetch('apps.json');
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const data = await response.json();
		state.categories = data.categories ?? {};
		state.apps = data.apps;
	} catch (error) {
		console.error('Không đọc được apps.json:', error);
		state.failed = true;
		showLoadError();
		return;
	}
	state.ready = true;
	updateControls();
	renderFilters();
	render(!matchMedia('(prefers-reduced-motion: reduce)').matches);
}

init();
