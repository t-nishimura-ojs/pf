function toEl(v) {
	if (!v) return null;
	if (typeof v === "string") return document.querySelector(v);
	if (v.nodeType === 1) return v;
	return null;
}

function px(n) {
	return Math.max(0, Number(n) || 0);
}

function wheelHorizontal(
	root,
	{
		wheelSpeed = 1.0,

		// ★スムーズ用
		smooth = true,
		smoothness = 0.12, // 0.05=ねっとり / 0.2=キビキビ（0〜1）

		header = null,
		footer = null,
		headerGap = 0,
		footerGap = 0,
		lockPageScroll = true,
		enableHashNav = true,
	} = {}
) {
	const track = root.querySelector(".track");
	if (!track) return;

	const headerEl = toEl(header);
	const footerEl = toEl(footer);

	function applyBars() {
		const h = headerEl ? headerEl.getBoundingClientRect().height : 0;
		const f = footerEl ? footerEl.getBoundingClientRect().height : 0;

		const topPad = h + px(headerGap);
		// const botPad = f + px(footerGap);
		const botPad = f -30; // ちょっと下に下がるように

		if (headerEl) {
			headerEl.style.position = "fixed";
			headerEl.style.top = "0";
			headerEl.style.left = "0";
			headerEl.style.right = "0";
			headerEl.style.zIndex = "9999";
		}

		if (footerEl) {
			footerEl.style.position = "fixed";
			footerEl.style.bottom = "0";
			footerEl.style.left = "0";
			footerEl.style.right = "0";
			footerEl.style.zIndex = "9999";
		}

		root.style.height = "100vh";

		const sticky = root.querySelector(".sticky");
		if (sticky) {
			sticky.style.height = `calc(100vh - ${topPad + botPad}px)`;
			sticky.style.marginTop = `${topPad}px`;
		} else {
			root.style.paddingTop = `${topPad}px`;
			root.style.paddingBottom = `${botPad}px`;
		}
	}

	if (lockPageScroll) {
		document.documentElement.style.height = "100%";
		document.body.style.height = "100%";
		document.body.style.overflow = "hidden";
	}

	applyBars();
	window.addEventListener("resize", applyBars);

	// --- スムーズスクロール用の状態 ---
	let targetX = track.scrollLeft; // 目標
	let rafId = 0;

	function step() {
		const current = track.scrollLeft;

		if (!smooth) {
			// smoothオフなら即反映
			track.scrollLeft = targetX;
			rafId = 0;
			return;
		}

		// 目標へ近づける（イージング）
		const next = current + (targetX - current) * smoothness;

		track.scrollLeft = next;

		// ほぼ到達したら止める
		if (Math.abs(targetX - next) < 0.5) {
			track.scrollLeft = targetX;
			rafId = 0;
			return;
		}

		rafId = requestAnimationFrame(step);
	}

	function kick() {
		if (!rafId) rafId = requestAnimationFrame(step);
	}

	function maxScrollLeft() {
		return Math.max(0, track.scrollWidth - track.clientWidth);
	}

	function onWheel(e) {
		const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;

		e.preventDefault();

		// 目標を更新して、アニメで追従
		targetX += delta * wheelSpeed;

		// 範囲内に丸める
		const maxX = maxScrollLeft();
		if (targetX < 0) targetX = 0;
		if (targetX > maxX) targetX = maxX;

		kick();
	}

	track.addEventListener("wheel", onWheel, { passive: false });
	function scrollToHash(hash, behavior = "smooth") {
		if (!hash || hash === "#") return false;

		const id = decodeURIComponent(hash.slice(1));
		const target = track.querySelector("#" + CSS.escape(id));
		if (!target) return false;

		// track内の子要素の左位置へ移動
		const left = target.offsetLeft;

		if (!smooth || behavior === "instant") {
			targetX = left;
			track.scrollLeft = left;
			return true;
		}

		targetX = left;
		kick();
		return true;
	}

	function onClickHash(e) {
		const a = e.target.closest('a[href^="#"]');
		if (!a) return;

		const hash = a.getAttribute("href");
		// track内にターゲットがあるなら横移動に変換
		if (scrollToHash(hash)) {
			e.preventDefault();
			history.pushState(null, "", hash);
		}
	}

	if (enableHashNav) {
		document.addEventListener("click", onClickHash);

		// 初期表示で # が付いてたら、そこへ横移動
		if (location.hash) {
			// レイアウト確定後に動かす
			requestAnimationFrame(() => {
				applyBars();
				scrollToHash(location.hash, "instant");
			});
		}

		// 戻る/進むでも反映
		window.addEventListener("hashchange", () => {
			scrollToHash(location.hash);
		});
	}

	// 初期化
	targetX = track.scrollLeft;

	return () => {
		if (rafId) cancelAnimationFrame(rafId);
		window.removeEventListener("resize", applyBars);
		track.removeEventListener("wheel", onWheel);

		if (enableHashNav) {
			document.removeEventListener("click", onClickHash);
			// hashchangeは無名関数で登録してるなら、ここは登録方法を変える必要ある
			// いったん気にしないなら削除OK（ライブラリとしては後で整理しよ）
		}
	};

}
