/* Simple client-side router (3+ pages): /about, /strengths, /goals */
const routes = ["/about", "/strengths", "/goals"];
const app = document.getElementById("app");
const yearEl = document.getElementById("year");
yearEl && (yearEl.textContent = new Date().getFullYear());
const routeOrder = ["/about", "/strengths", "/goals"];
const routeTitles = {
  "/about": "基本情報",
  "/strengths": "自身の強み",
  "/goals": "今後の目標"
};


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

  // --- route-specific UI (you already had this) ---
  const body = document.body;
  body.classList.remove("route-about","route-strengths","route-goals");
  if(path === "/about") body.classList.add("route-about");
  if(path === "/strengths") body.classList.add("route-strengths");
  if(path === "/goals") body.classList.add("route-goals");

updatePager(path);


  // Overlay title text + replay its fade-in
  const titleEl = document.getElementById("routeTitle");
  if(titleEl){
    if(path === "/strengths"){
      titleEl.textContent = "強み";
      titleEl.removeAttribute("aria-hidden");
      restartFade(titleEl);              // replay fade-in each visit
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
  // -----------------------------------------------

  // Reset & reattach animations for elements in the target page
  resetAnimationsFor(target);

  // a11y focus + kick IO once
  app.focus({preventScroll:true});
  revealNow();
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

/* Carousel */
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
    this.dots.innerHTML = "";
    this.items.forEach((_,i)=>{
      const b = document.createElement("button");
      b.setAttribute("aria-label", `移動 ${i+1}`);
      b.addEventListener("click", ()=>this.go(i));
      this.dots.appendChild(b);
    });
  }
  onScroll(){
    const w = this.items[0]?.getBoundingClientRect().width || 1;
    const idx = Math.round(this.track.scrollLeft / (w+12)); // 12 = gap
    if(idx !== this.index){ this.index = idx; this.syncDots(); }
  }
  go(i){
    this.index = (i+this.items.length)%this.items.length;
    const item = this.items[this.index];
    const x = item.offsetLeft - this.track.offsetLeft;
    this.track.scrollTo({left:x-12, behavior:"smooth"});
    this.syncDots();
  }
  syncDots(){
    const dots = Array.from(this.dots.children);
    dots.forEach(d=>d.removeAttribute("aria-current"));
    dots[this.index]?.setAttribute("aria-current","true");
  }
  update(){ this.go(this.index); }
 
}
document.querySelectorAll(".carousel").forEach(c=>new Carousel(c));

/* Prefetch reveal when navigating pages */
window.addEventListener("hashchange", ()=>setTimeout(revealNow, 50));

/* Button at the Bottom */
function updatePager(path){
  const prevA = document.querySelector("#pager .prev");
  const nextA = document.querySelector("#pager .next");
  if(!prevA || !nextA) return;

  const i = routeOrder.indexOf(path);
  const prev = i > 0 ? routeOrder[i-1] : null;
  const next = i < routeOrder.length-1 ? routeOrder[i+1] : null;

  // prev
  if(prev){
    prevA.setAttribute("href", `#${prev}`);
    prevA.removeAttribute("aria-disabled");
    prevA.querySelector(".pager-label").textContent = routeTitles[prev];
  }else{
    prevA.setAttribute("href", "#");
    prevA.setAttribute("aria-disabled","true");
    prevA.querySelector(".pager-label").textContent = "";
  }

  // next
  if(next){
    nextA.setAttribute("href", `#${next}`);
    nextA.removeAttribute("aria-disabled");
    nextA.querySelector(".pager-label").textContent = routeTitles[next];
  }else{
    nextA.setAttribute("href", "#");
    nextA.setAttribute("aria-disabled","true");
    nextA.querySelector(".pager-label").textContent = "";
  }
}
