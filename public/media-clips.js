(() => {
 const sections=document.querySelectorAll('[data-video-clips]');if(!sections.length)return;
 const motion=matchMedia('(prefers-reduced-motion: reduce)'),videos=new Set();
 const local=value=>{try{const url=new URL(value,location.href),base=new URL('assets/',location.href);return url.origin===base.origin&&url.pathname.startsWith(base.pathname)?url.href:null;}catch{return null;}};
 const observer=new IntersectionObserver(entries=>{for(const entry of entries){const video=entry.target;video.dataset.visible=String(entry.intersectionRatio>=.6);if(entry.intersectionRatio>=.6&&!motion.matches&&!document.hidden)video.play().catch(()=>{});else video.pause();}},{threshold:[0,.6]});
 fetch('assets/portfolio-media.json',{cache:'no-cache'}).then(r=>r.json()).then(data=>{
  const clips=(data.clips||[]).filter(clip=>local(clip.src));if(!clips.length)return;
  sections.forEach(section=>{const grid=section.querySelector('.clip-grid');(section.dataset.videoClips==='homepage'?clips.slice(0,2):clips).forEach(clip=>{const figure=document.createElement('figure');figure.className='local-clip';const video=document.createElement('video');video.src=local(clip.src);video.muted=true;video.defaultMuted=true;video.loop=true;video.playsInline=true;video.controls=true;video.preload='metadata';if(local(clip.poster))video.poster=local(clip.poster);const caption=document.createElement('figcaption');caption.textContent=clip.title||'Live video by Logan M.';figure.append(video,caption);grid.append(figure);videos.add(video);observer.observe(video);});section.hidden=false;});
 }).catch(()=>{});
 const pause=()=>{for(const video of videos){if(document.hidden||motion.matches)video.pause();else if(video.dataset.visible==='true')video.play().catch(()=>{});}};document.addEventListener('visibilitychange',pause);motion.addEventListener('change',pause);
})();
