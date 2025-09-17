// ====== Client-side hash router (/about, /strengths, /goals) ======
const ROUTES = ["/about", "/strengths", "/goals"];
const ROUTE_TITLES = {
  "/about": "基本情報",
  "/strengths": "自身の強み",
  "/goals": "今後の目標"
};

const app = document.getElementById("app");
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Restart a CSS .fade-in animation on demand
function restartFade(el){
  el.classList.remove("fade-in");
  // force reflow so the animation can run again
  void el.offsetWidth;
  el.classList.add("fade-in");
}

// Reset .reveal & .fade-in elements inside a given section
function resetAnimationsFor(section){
  if(!section) return;
  // Reset scroll-reveals so IO can play them again
  section.querySelectorAll(".reveal").forEach(el=>{
    el.style.opacity = 0;
    el.style.transform = "translateY(16px)";
    el.style.transitionDelay = "";     // let data-delay apply again
    io.observe(el);                    // re-observe this element
  });
  // Restart any CSS-only fade-ins on this page (e.g., names / route title)
  section.querySelectorAll(".fade-in").forEach(restartFade);
}

function setActiveLink(path){
  document.querySelectorAll('.nav a[data-link]').forEach(a=>{
    a.removeAttribute('aria-current');
    if(a.getAttribute('href') === `#${path}`) a.setAttribute('aria-current','page');
  });
}

function showRoute(path){
  const pages = app.querySelectorAll(".page");
  let shown = false;
  let target = null;

  pages.forEach(sec=>{
    const match = sec.getAttribute("data-route") === path;
    sec.setAttribute("aria-hidden", match ? "false" : "true");
    if(match){ shown = true; target = sec; }
  });

  if(!shown){
    location.hash = "#/about";
    showRoute("/about");
    return;
  }
  setActiveLink(path);

  // route-specific UI
  const body = document.body;
  body.classList.remove("route-about","route-strengths","route-goals");
  if(path === "/about") body.classList.add("route-about");
  if(path === "/strengths") body.classList.add("route-strengths");
  if(path === "/goals") body.classList.add("route-goals");

  // Update pager
  updatePager(path);

  // Overlay title text + replay its fade-in
  const titleEl = document.getElementById("routeTitle");
  if(titleEl){
    if(path === "/strengths"){
      titleEl.textContent = "強み";
      titleEl.removeAttribute("aria-hidden");
      restartFade(titleEl);
    } else if(path === "/goals"){
      titleEl.textContent = "今後の目標";
      titleEl.removeAttribute("aria-hidden");
      restartFade(titleEl);
    } else {
      titleEl.textContent = "";
      titleEl.setAttribute("aria-hidden","true");
    }
  }
  // If About shows names with .fade-in, replay them too
  if(path === "/about"){
    document.querySelectorAll(".name-en, .name-ja").forEach(restartFade);
  }

  // Reset & reattach animations for elements in the target page
  resetAnimationsFor(target);

  // a11y focus + kick IO once
  app.focus({preventScroll:true});
  revealNow();
}

// キーイベント Track SPA route changes in GTM/GA4
function trackPageView(path){
  window.dataLayer.push({
    event: "page_view_spa",
    page_path: path,
    page_title: ROUTE_TITLES[path] || path
  });
}

function trackRouteCount(path){
  let c = parseInt(sessionStorage.getItem('route_count') || '0', 10);
  c += 1;
  sessionStorage.setItem('route_count', String(c));
  if (c >= 3 && !sessionStorage.getItem('route_3plus_fired')) {
    window.dataLayer.push({
      event: "key_3plus_pages",
      page_path: path,
      route_count: c
    });
    sessionStorage.setItem('route_3plus_fired', '1');
  }
}

// キーイベント Hook into routing
function handleHash(){
  const path = location.hash.replace(/^#/, "") || "/about";
  showRoute(path);            // update UI
  trackPageView(path);        // 👈 push custom SPA page view
  trackRouteCount(path);      // 👈 optional: for the “3+ pages” key event
}

/* Hash routing */
function handleHash(){
  const path = location.hash.replace(/^#/, "") || "/about";
  showRoute(path);
}
window.addEventListener("hashchange", handleHash);
window.addEventListener("load", handleHash);

/* Mobile menu */
const menuBtn = document.getElementById("menuBtn");
const nav = document.querySelector(".nav");
menuBtn?.addEventListener("click", ()=>{
  nav.classList.toggle("open");
});

/* Intersection Observer reveal animation (JS animation requirement) */
const io = new IntersectionObserver((entries)=>{
  for(const e of entries){
    if(e.isIntersecting){
      const d = parseFloat(e.target.dataset.delay || 0);
      e.target.style.transitionDelay = `${d}s`;
      e.target.style.opacity = 1;
      e.target.style.transform = "translateY(0)";
      io.unobserve(e.target);
    }
  }
},{threshold:0.15});
function revealNow(){
  document.querySelectorAll(".page[aria-hidden='false'] .reveal").forEach(el=>io.observe(el));
}
document.addEventListener("DOMContentLoaded", revealNow);

/* Carousel (more robust index detection; no hardcoded gap) */
class Carousel {
  constructor(root){
    this.root = root;
    this.track = root.querySelector(".carousel-track");
    this.items = Array.from(root.querySelectorAll(".carousel-item"));
    this.prevBtn = root.querySelector("[data-carousel-prev]");
    this.nextBtn = root.querySelector("[data-carousel-next]");
    this.dots = root.querySelector("[data-carousel-dots]");
    this.index = 0;
    this.bind();
    this.renderDots();
    this.update();
  }
  bind(){
    this.prevBtn?.addEventListener("click", ()=>this.go(this.index-1));
    this.nextBtn?.addEventListener("click", ()=>this.go(this.index+1));
    this.track?.addEventListener("scroll", this.onScroll.bind(this), {passive:true});
    window.addEventListener("resize", ()=>this.update());
  }
  renderDots(){
    if(!this.dots) return;
    this.dots.innerHTML = "";
    this.items.forEach((_,i)=>{
      const b = document.createElement("button");
      b.setAttribute("aria-label", `移動 ${i+1}`);
      b.addEventListener("click", ()=>this.go(i));
      this.dots.appendChild(b);
    });
  }
  onScroll(){
    // Find the item whose left edge is closest to current scrollLeft
    const pos = this.track.scrollLeft + this.track.clientLeft;
    let closest = 0;
    let minDist = Infinity;
    this.items.forEach((item, i)=>{
      const dist = Math.abs(item.offsetLeft - pos);
      if(dist < minDist){ minDist = dist; closest = i; }
    });
    if(closest !== this.index){ this.index = closest; this.syncDots(); }
  }
  go(i){
    if(!this.items.length) return;
    this.index = (i+this.items.length)%this.items.length;
    const item = this.items[this.index];
    const x = item.offsetLeft - this.track.offsetLeft;
    this.track.scrollTo({left:x, behavior:"smooth"});
    this.syncDots();
  }
  syncDots(){
    if(!this.dots) return;
    const dots = Array.from(this.dots.children);
    dots.forEach(d=>d.removeAttribute("aria-current"));
    dots[this.index]?.setAttribute("aria-current","true");
  }
  update(){ this.go(this.index); }
}
document.querySelectorAll(".carousel").forEach(c=>new Carousel(c));

/* Prefetch reveal when navigating pages */
window.addEventListener("hashchange", ()=>setTimeout(revealNow, 50));

/* Pager (Prev/Next) */
function updatePager(path){
  const prevA = document.querySelector("#pager .prev");
  const nextA = document.querySelector("#pager .next");
  if(!prevA || !nextA) return;

  const i = ROUTES.indexOf(path);
  const prev = i > 0 ? ROUTES[i-1] : null;
  const next = i < ROUTES.length-1 ? ROUTES[i+1] : null;

  // prev
  if(prev){
    prevA.setAttribute("href", `#${prev}`);
    prevA.removeAttribute("aria-disabled");
    prevA.querySelector(".pager-label").textContent = ROUTE_TITLES[prev];
  }else{
    prevA.setAttribute("href", "#");
    prevA.setAttribute("aria-disabled","true");
    prevA.querySelector(".pager-label").textContent = "";
  }

  // next
  if(next){
    nextA.setAttribute("href", `#${next}`);
    nextA.removeAttribute("aria-disabled");
    nextA.querySelector(".pager-label").textContent = ROUTE_TITLES[next];
  }else{
    nextA.setAttribute("href", "#");
    nextA.setAttribute("aria-disabled","true");
    nextA.querySelector(".pager-label").textContent = "";
  }
}

/* Like Buttons */
window.dataLayer = window.dataLayer || [];

(function setupLikeIcons(){
  document.querySelectorAll(".like-icon").forEach(icon => {
    const gtmId    = icon.getAttribute("data-gtm-id");
    const countEl  = icon.parentElement.querySelector(".like-count");
    const storeKey = "likes_" + gtmId;

    // Load existing count (per browser)
    let likes = parseInt(localStorage.getItem(storeKey) || "0", 10);
    if (countEl) countEl.textContent = String(likes);

    function toggleLike(){
      const isLiked = icon.classList.contains("liked");

      if (isLiked) {
        // Unlike
        likes = Math.max(0, likes - 1); // never below 0
        icon.classList.remove("liked");
        icon.setAttribute("aria-pressed", "false");
      } else {
        // Like
        likes += 1;
        icon.classList.add("liked");
        icon.setAttribute("aria-pressed", "true");
      }

      // Update count
      localStorage.setItem(storeKey, String(likes));
      if (countEl) countEl.textContent = String(likes);

      // Push event to GTM/GA4
      window.dataLayer.push({
        event: "like",
        like_location: gtmId,
        like_total: likes,
        action: isLiked ? "unlike" : "like"
      });
    }

    // Mouse click
    icon.addEventListener("click", toggleLike);

    // Keyboard (Enter or Space)
    icon.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleLike();
      }
    });
  });
})();