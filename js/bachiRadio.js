/* =========================================================
   Bachiradio — modal de reproducción (Tainacan)
   ========================================================= */
(function () {
    var TAINACAN_ITEM_URL = "https://tainacan.bidiban.sep.gob.mx/wp-json/tainacan/v2/items/";

    var modal = document.getElementById("brPlayerModal");
    if (!modal) return;

    var audioEl = document.getElementById("brModalAudio");
    var titleEl = document.getElementById("brModalTitle");
    var tagEl = document.getElementById("brModalTag");
    var descEl = document.getElementById("brModalDesc");
    var metaEl = document.getElementById("brModalMeta");

    var lastFocusedEl = null;
    var currentRequestId = 0;

    // Campos de metadata que ya se muestran aparte o son de uso interno de Tainacan.
    var META_SKIP = ["titulo-2", "public_url", "modification_date", "user_last_modified", "creation_date"];
    var TAG_KEY_HINTS = ["asignatura"];

    function setState(state) {
        modal.classList.remove("is-loading", "is-error", "is-ready");
        modal.classList.add("is-" + state);
    }

    function resetContent() {
        audioEl.pause();
        audioEl.removeAttribute("src");
        audioEl.load();
        titleEl.textContent = "";
        tagEl.textContent = "";
        descEl.textContent = "";
        metaEl.innerHTML = "";
    }

    function extractAudioSrc(item) {
        if (item.document_as_html) {
            var match = /src="([^"]+)"/.exec(item.document_as_html);
            if (match) return match[1];
        }
        return "";
    }

    function findTag(metadata) {
        for (var key in metadata) {
            if (TAG_KEY_HINTS.some(function (hint) { return key.indexOf(hint) !== -1; })) {
                var value = metadata[key].value_as_string;
                if (value) return value;
            }
        }
        return "";
    }

    function renderMeta(metadata) {
        metaEl.innerHTML = "";
        Object.keys(metadata).forEach(function (key) {
            if (META_SKIP.indexOf(key) !== -1) return;
            var field = metadata[key];
            var value = field.value_as_string;
            if (!value) return;

            var row = document.createElement("div");
            var dt = document.createElement("dt");
            dt.textContent = field.name;
            var dd = document.createElement("dd");
            dd.textContent = value;
            row.appendChild(dt);
            row.appendChild(dd);
            metaEl.appendChild(row);
        });
    }

    function renderItem(item) {
        titleEl.textContent = item.title || "";
        descEl.textContent = item.description || "";
        tagEl.textContent = findTag(item.metadata || {});

        var src = extractAudioSrc(item);
        if (src) audioEl.setAttribute("src", src);

        if (item.metadata) renderMeta(item.metadata);
    }

    function loadEpisode(id) {
        var requestId = ++currentRequestId;
        resetContent();
        setState("loading");

        fetch(TAINACAN_ITEM_URL + encodeURIComponent(id))
            .then(function (res) {
                if (!res.ok) throw new Error("HTTP " + res.status);
                return res.json();
            })
            .then(function (item) {
                if (requestId !== currentRequestId) return; // el modal se cerró/cambió de episodio
                renderItem(item);
                setState("ready");
            })
            .catch(function () {
                if (requestId !== currentRequestId) return;
                setState("error");
            });
    }

    function openModal(id) {
        lastFocusedEl = document.activeElement;
        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";

        if (!id) {
            setState("error");
            return;
        }
        loadEpisode(id);
    }

    function closeModal() {
        currentRequestId++; // invalida cualquier fetch en curso
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        resetContent();
        setState("loading");
        if (lastFocusedEl && typeof lastFocusedEl.focus === "function") {
            lastFocusedEl.focus();
        }
    }

    document.addEventListener("click", function (event) {
        var playBtn = event.target.closest(".br-play");
        if (playBtn) {
            event.preventDefault();
            openModal(playBtn.getAttribute("data-tainacan-id"));
            return;
        }
        if (event.target.closest("[data-br-modal-close]")) {
            closeModal();
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && modal.classList.contains("is-open")) {
            closeModal();
        }
    });
})();
