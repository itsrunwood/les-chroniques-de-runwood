/*
 * Journal de Quête — scripts du thème
 * Menu mobile, recherche, frappe animée, temps de lecture,
 * barre de progression, copie de lien, retour en haut.
 */
(function () {
    'use strict';

    var doc = document;
    var body = doc.body;
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function $(selector, root) { return (root || doc).querySelector(selector); }
    function $$(selector, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(selector)); }

    /* Menu mobile */
    var toggle = $('.js-menu-toggle');
    var nav = $('.js-nav');

    if (toggle && nav) {
        toggle.addEventListener('click', function () {
            var open = nav.classList.toggle('is-open');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });

        doc.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && nav.classList.contains('is-open')) {
                nav.classList.remove('is-open');
                toggle.setAttribute('aria-expanded', 'false');
                toggle.focus();
            }
        });
    }

    /* Recherche */
    var searchBtn = $('.js-search-btn');
    var searchBox = $('.js-search');

    function closeSearch() {
        if (!searchBox) { return; }
        searchBox.hidden = true;
        searchBtn.setAttribute('aria-expanded', 'false');
    }

    if (searchBtn && searchBox) {
        searchBtn.addEventListener('click', function () {
            var willOpen = searchBox.hidden;
            searchBox.hidden = !willOpen;
            searchBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');

            if (willOpen) {
                var input = $('input', searchBox);
                if (input) { input.focus(); }
            }
        });

        var closeBtn = $('.js-search-close');
        if (closeBtn) { closeBtn.addEventListener('click', closeSearch); }

        doc.addEventListener('keydown', function (e) {
            var tag = (doc.activeElement && doc.activeElement.tagName) || '';

            if (e.key === 'Escape' && !searchBox.hidden) {
                closeSearch();
                searchBtn.focus();
            }

            // Touche « / » pour ouvrir la recherche, comme dans un terminal
            if (e.key === '/' && searchBox.hidden && !/INPUT|TEXTAREA|SELECT/.test(tag)) {
                e.preventDefault();
                searchBtn.click();
            }
        });
    }

    /* Accueil : frappe de la commande puis déchiffrement de la description */
    var hero = $('.js-hero');
    var typed = $('.js-type');
    var statusEl = $('.js-hero-status');
    var heroText = hero ? $('.hero__text', hero) : null;
    var GLYPHS = '#%&@$*+=?!<>/\\|{}[]01▓▒░§¤ΔΣΨ';

    function randomGlyph() { return GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length)); }

    function textNodes(root) {
        var out = [];
        var walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
        while (walker.nextNode()) {
            if (walker.currentNode.nodeValue.trim()) { out.push(walker.currentNode); }
        }
        return out;
    }

    function decrypt(root, duration, done) {
        var nodes = textNodes(root);
        var originals = nodes.map(function (n) { return n.nodeValue; });
        var total = originals.reduce(function (sum, t) { return sum + t.length; }, 0);
        var offsets = [];
        var acc = 0;
        originals.forEach(function (t) { offsets.push(acc); acc += t.length; });
        var start = null;

        function frame(now) {
            if (start === null) { start = now; }
            var progress = Math.min(1, (now - start) / duration);
            var revealed = Math.floor(progress * total);

            nodes.forEach(function (node, k) {
                var original = originals[k];
                var out = '';
                for (var c = 0; c < original.length; c++) {
                    var ch = original.charAt(c);
                    if (offsets[k] + c < revealed || /\s/.test(ch)) {
                        out += ch;
                    } else {
                        out += randomGlyph();
                    }
                }
                node.nodeValue = out;
            });

            if (statusEl) {
                var pct = Math.round(progress * 100);
                var filled = Math.round(progress * 16);
                statusEl.textContent = '[déchiffrement] ' + new Array(filled + 1).join('▓') + new Array(17 - filled).join('░') + ' ' + pct + '%';
            }

            if (progress < 1) {
                window.requestAnimationFrame(frame);
            } else {
                nodes.forEach(function (node, k) { node.nodeValue = originals[k]; });
                if (statusEl) {
                    statusEl.innerHTML = '<span class="hero__status-ok">[OK]</span> description déchiffrée — accès autorisé';
                }
                if (done) { done(); }
            }
        }

        window.requestAnimationFrame(frame);
    }

    if (hero && body.classList.contains('fx-typing') && !reduceMotion) {
        var text = typed ? (typed.getAttribute('data-text') || typed.textContent) : '';
        var i = 0;

        var heroTextHTML = heroText ? heroText.innerHTML : '';

        if (heroText) {
            // on brouille tout de suite le texte avant de l'afficher
            hero.classList.add('is-decrypting');
            textNodes(heroText).forEach(function (n) {
                n.nodeValue = n.nodeValue.replace(/\S/g, randomGlyph);
            });
        }

        hero.classList.add('is-ready');

        var cursor = doc.createElement('span');
        cursor.className = 'cursor';
        cursor.setAttribute('aria-hidden', 'true');
        cursor.textContent = '_';

        if (typed) {
            typed.textContent = '';
            typed.parentNode.appendChild(cursor);
        }

        var startDecrypt = function () {
            if (cursor.parentNode) { cursor.parentNode.removeChild(cursor); }
            hero.classList.add('is-art');
            if (heroText) {
                hero.classList.add('is-decrypting');
                heroText.innerHTML = heroTextHTML;
                decrypt(heroText, 1800, function () { hero.classList.remove('is-decrypting'); });
            }
        };

        var step = function () {
            if (typed && i <= text.length) {
                typed.textContent = text.slice(0, i);
                i++;
                window.setTimeout(step, 30 + Math.random() * 45);
            } else {
                window.setTimeout(startDecrypt, 300);
            }
        };

        window.setTimeout(step, 300);
    } else if (hero) {
        hero.classList.add('is-ready', 'is-art');
    }

    /* Dessin collé sur une seule ligne : on rétablit les retours à la ligne */
    $$('.js-hero-art').forEach(function (pre) {
        var t = pre.textContent;
        if (t.indexOf('\n') === -1 && t.indexOf(' ') > -1) {
            pre.textContent = t.split(' ').join('\n');
        }
    });

    /* Temps de lecture */
    var content = $('.js-content');
    var readingEl = $('.js-reading-time');

    if (content && readingEl) {
        var words = (content.textContent || '').trim().split(/\s+/).filter(Boolean).length;

        if (words > 60) {
            var minutes = Math.max(1, Math.round(words / 230));
            readingEl.textContent = minutes + ' min de lecture';
            readingEl.hidden = false;
        }
    }

    /* Barre de progression de lecture */
    var bar = $('.js-progress');

    if (bar && content) {
        var ticking = false;

        var update = function () {
            var rect = content.getBoundingClientRect();
            var total = rect.height - window.innerHeight * 0.6;
            var done = -rect.top + window.innerHeight * 0.25;
            var ratio = total > 0 ? Math.min(1, Math.max(0, done / total)) : 0;
            bar.style.transform = 'scaleX(' + ratio.toFixed(4) + ')';
            ticking = false;
        };

        window.addEventListener('scroll', function () {
            if (!ticking) {
                window.requestAnimationFrame(update);
                ticking = true;
            }
        }, { passive: true });

        window.addEventListener('resize', update);
        update();
    }

    /* Copier le lien de l'article */
    $$('.js-copy-link').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var url = btn.getAttribute('data-url') || window.location.href;
            var original = btn.textContent;

            var done = function (ok) {
                btn.textContent = ok ? '[lien copié ✓]' : '[copie impossible]';
                window.setTimeout(function () { btn.textContent = original; }, 1800);
            };

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
            } else {
                done(false);
            }
        });
    });

    /* Retour en haut */
    $$('.js-top-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        });
    });

    /* Page galerie : recherche, filtre par étiquette, pagination */
    var archive = $('.js-archive');

    if (archive) {
        var items = $$('.js-archive-item', archive);
        var searchInput = $('.js-archive-search', archive);
        var tagButtons = $$('.js-archive-tag', archive);
        var countEl = $('.js-archive-count', archive);
        var emptyEl = $('.js-archive-empty', archive);
        var pager = $('.js-archive-pagination', archive);
        var perPage = parseInt(archive.getAttribute('data-per-page'), 10) || 40;
        var state = { q: '', tag: '', page: 1 };

        var normalize = function (str) {
            return String(str || '')
                .replace(/<[^>]+>/g, ' ')
                .toLowerCase()
                .normalize('NFD').replace(/[̀-ͯ]/g, '');
        };

        items.forEach(function (item) {
            item._search = normalize(item.getAttribute('data-search'));
            item._tags = ' ' + (item.getAttribute('data-tags') || '').trim().split(/\s+/).join(' ') + ' ';
        });

        // État lu depuis l'adresse : galerie.html?tag=lore&q=roi&page=2
        try {
            var params = new URLSearchParams(window.location.search);
            state.q = params.get('q') || '';
            state.tag = params.get('tag') || '';
            state.page = parseInt(params.get('page'), 10) || 1;
        } catch (e) {}

        if (searchInput) { searchInput.value = state.q; }

        var saveState = function () {
            try {
                var params = new URLSearchParams();
                if (state.q) { params.set('q', state.q); }
                if (state.tag) { params.set('tag', state.tag); }
                if (state.page > 1) { params.set('page', state.page); }
                var qs = params.toString();
                window.history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : ''));
            } catch (e) {}
        };

        var pageButton = function (label, page, opts) {
            var b = doc.createElement('button');
            b.type = 'button';
            b.className = 'archive__page';
            b.textContent = label;
            if (opts && opts.current) { b.setAttribute('aria-current', 'page'); b.disabled = true; }
            if (opts && opts.disabled) { b.disabled = true; }
            if (opts && opts.label) { b.setAttribute('aria-label', opts.label); }
            b.addEventListener('click', function () {
                state.page = page;
                render();
                archive.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
            });
            return b;
        };

        var render = function () {
            var terms = normalize(state.q).split(/\s+/).filter(Boolean);
            var matches = items.filter(function (item) {
                if (state.tag && item._tags.indexOf(' ' + state.tag + ' ') === -1) { return false; }
                for (var t = 0; t < terms.length; t++) {
                    if (item._search.indexOf(terms[t]) === -1) { return false; }
                }
                return true;
            });

            var pages = Math.max(1, Math.ceil(matches.length / perPage));
            if (state.page > pages) { state.page = pages; }
            if (state.page < 1) { state.page = 1; }
            var from = (state.page - 1) * perPage;
            var to = from + perPage;

            items.forEach(function (item) { item.hidden = true; });
            matches.slice(from, to).forEach(function (item) { item.hidden = false; });

            tagButtons.forEach(function (btn) {
                var active = (btn.getAttribute('data-tag') || '') === state.tag;
                btn.classList.toggle('is-active', active);
                btn.setAttribute('aria-pressed', active ? 'true' : 'false');
            });

            if (countEl) {
                countEl.textContent = matches.length
                    ? matches.length + (matches.length > 1 ? ' quêtes trouvées' : ' quête trouvée') + (pages > 1 ? ' — page ' + state.page + '/' + pages : '')
                    : '';
            }
            if (emptyEl) { emptyEl.hidden = matches.length > 0; }

            if (pager) {
                pager.innerHTML = '';
                pager.hidden = pages <= 1;
                if (pages > 1) {
                    pager.appendChild(pageButton('[←]', state.page - 1, { disabled: state.page === 1, label: 'Page précédente' }));
                    for (var n = 1; n <= pages; n++) {
                        if (n === 1 || n === pages || Math.abs(n - state.page) <= 2) {
                            pager.appendChild(pageButton(String(n), n, { current: n === state.page, label: 'Page ' + n }));
                        } else if (Math.abs(n - state.page) === 3) {
                            var dots = doc.createElement('span');
                            dots.className = 'archive__page';
                            dots.textContent = '…';
                            pager.appendChild(dots);
                        }
                    }
                    pager.appendChild(pageButton('[→]', state.page + 1, { disabled: state.page === pages, label: 'Page suivante' }));
                }
            }

            saveState();
        };

        var timer = null;
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                window.clearTimeout(timer);
                timer = window.setTimeout(function () {
                    state.q = searchInput.value.trim();
                    state.page = 1;
                    render();
                }, 150);
            });
        }

        tagButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                var tag = btn.getAttribute('data-tag') || '';
                state.tag = state.tag === tag ? '' : tag;
                state.page = 1;
                render();
            });
        });

        $$('.js-archive-reset', archive).forEach(function (btn) {
            btn.addEventListener('click', function () {
                state = { q: '', tag: '', page: 1 };
                if (searchInput) { searchInput.value = ''; }
                render();
            });
        });

        render();
    }
})();
