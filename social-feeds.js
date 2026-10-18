(() => {
  if (!document.querySelector('.instagram-preview')) return;
  const MAX_POSTS = 3;
  const REFRESH_MS = 5 * 60 * 1000;
  const cache = new Map();
  const initialized = new WeakSet();
  const config = fetch('social-feeds.json', {cache:'no-cache'})
    .then(response => response.ok ? response.json() : {accounts:{}})
    .catch(() => ({accounts:{}}));

  function httpsUrl(value) {
    try { const url = new URL(value); return url.protocol==='https:' ? url.href : null; }
    catch { return null; }
  }
  function postUrl(value) {
    const safe=httpsUrl(value);
    if (!safe) return null;
    const url=new URL(safe);
    return ['instagram.com','www.instagram.com'].includes(url.hostname) ? safe : null;
  }
  function link(url,text,className) {
    const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.className=className;
    a.textContent=text;return a;
  }
  function setStatus(box,text) {
    let status=box.querySelector('.embed-status');
    if (!status) {status=document.createElement('p');status.className='embed-status';box.append(status);}
    const handle=box.dataset.profileHandle;
    status.replaceChildren(document.createTextNode(text+' '),link('https://www.instagram.com/'+handle+'/','Open on Instagram','embed-direct'));
  }
  async function feedData(handle,feedId) {
    const key=handle+':'+feedId, cached=cache.get(key);
    if (cached && Date.now()-cached.created<REFRESH_MS) return cached.promise;
    const request=(async()=>{
      const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
      try {
        const response=await fetch('https://feeds.behold.so/'+encodeURIComponent(feedId),{cache:'no-store',signal:controller.signal});
        if (!response.ok) throw Error('Feed unavailable');
        const payload=await response.json();
        if (payload.username && payload.username.toLowerCase().replace(/^@/,'')!==handle.toLowerCase()) throw Error('Account mismatch');
        const posts=Array.isArray(payload) ? payload : payload.posts;
        if (!Array.isArray(posts)) throw Error('Invalid feed');
        // A carousel is one post. Deduplicate, sort by publication time, then take at most three.
        const unique=new Map();
        posts.forEach(post=>{const permalink=postUrl(post.permalink);if(permalink)unique.set(String(post.id||permalink),{...post,permalink});});
        return [...unique.values()].sort((a,b)=>(Date.parse(b.timestamp)||0)-(Date.parse(a.timestamp)||0)).slice(0,MAX_POSTS);
      } finally {clearTimeout(timeout);}
    })();
    cache.set(key,{created:Date.now(),promise:request});
    try {return await request;}catch(error){cache.delete(key);throw error;}
  }
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const videos=new Set(), cleanupByBox=new WeakMap();
  let activePostDialog=null;
  function mediaUrl(value) {
    const absolute=httpsUrl(value);if(absolute)return absolute;
    try {const url=new URL(value,location.href);return url.origin===location.origin && url.pathname.startsWith('/assets/') ? url.href : null;}catch{return null;}
  }
  function updateVideo(video) {
    const carousel=video.closest('.post-carousel');
    const slide=video.closest('.managed-post');
    const visible=video.dataset.viewportVisible==='true' && !document.hidden && !activePostDialog?.open && carousel?.dataset.activeIndex===slide?.dataset.index;
    if(!visible){video.autoplay=false;video.pause();return;}
    if(video.dataset.autoplayReel==='true' && !reducedMotion.matches && video.muted){
      video.preload='metadata';video.autoplay=true;const play=video.play();play?.catch(()=>{});
    }
  }
  function updateVideos(){videos.forEach(video=>{if(!video.isConnected){videoObserver?.unobserve(video);videos.delete(video);}else updateVideo(video);});}
  const videoObserver='IntersectionObserver' in window ? new IntersectionObserver(entries=>entries.forEach(entry=>{
    entry.target.dataset.viewportVisible=String(entry.isIntersecting && entry.intersectionRatio>=.6);updateVideo(entry.target);
  }),{threshold:[0,.6,1]}) : null;
  document.addEventListener('visibilitychange',updateVideos);
  reducedMotion.addEventListener('change',()=>{videos.forEach(video=>{if(reducedMotion.matches && video.autoplay){video.pause();video.autoplay=false;}});updateVideos();});
  function openPost(post,handle) {
    if(!activePostDialog){
      activePostDialog=document.createElement('dialog');activePostDialog.className='social-post-dialog';activePostDialog.setAttribute('aria-labelledby','social-post-title');
      activePostDialog.addEventListener('click',event=>{if(event.target!==activePostDialog)return;const rect=activePostDialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)activePostDialog.close();});
      activePostDialog.addEventListener('close',()=>{activePostDialog.querySelectorAll('video').forEach(video=>{video.pause();video.removeAttribute('src');video.load();});activePostDialog.replaceChildren();document.body.classList.remove('lightbox-open');updateVideos();});
      document.body.append(activePostDialog);
    }
    activePostDialog.querySelectorAll('video').forEach(video=>video.pause());
    const close=document.createElement('button');close.type='button';close.className='social-post-close';close.textContent='Close';close.setAttribute('aria-label','Close post');close.addEventListener('click',()=>activePostDialog.close());
    const layout=document.createElement('div');layout.className='social-post-layout';
    const media=document.createElement('div');media.className='social-post-media';
    const item=post.mediaType==='CAROUSEL_ALBUM' && post.children?.length ? post.children[0] : post;
    const isVideo=item.mediaType==='VIDEO';
    const source=mediaUrl(isVideo?item.mediaUrl:(item.sizes?.large?.mediaUrl || item.mediaUrl));
    const poster=mediaUrl(item.sizes?.medium?.mediaUrl || item.thumbnailUrl);
    let video=null;
    if(source && isVideo){video=document.createElement('video');video.src=source;video.controls=true;video.playsInline=true;video.muted=true;video.defaultMuted=true;video.loop=Boolean(post.isReel);video.setAttribute('muted','');video.setAttribute('playsinline','');video.setAttribute('aria-label','Video by @'+handle);if(poster)video.poster=poster;media.append(video);}
    else if(source){const image=document.createElement('img');image.src=source;image.alt=item.altText || post.altText || 'Photo by @'+handle;media.append(image);}
    const text=document.createElement('div');text.className='social-post-text';
    const title=document.createElement('h2');title.id='social-post-title';title.textContent='@'+handle;
    const caption=document.createElement('p');caption.className='social-post-full-caption';caption.textContent=post.caption || post.prunedCaption || '';
    text.append(title,caption,link(postUrl(post.permalink)||'https://www.instagram.com/'+handle+'/',post.permalink?'Open original on Instagram':'View Instagram profile','text-link'));
    layout.append(media,text);activePostDialog.replaceChildren(close,layout);activePostDialog.showModal();document.body.classList.add('lightbox-open');updateVideos();
    if(video && post.isReel && !reducedMotion.matches){video.autoplay=true;video.play()?.catch(()=>{});}
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden)activePostDialog?.querySelectorAll('video').forEach(video=>video.pause());});
  function renderPost(post,handle,index,total) {
    const figure=document.createElement('figure');figure.className='managed-post';figure.dataset.index=String(index);
    figure.setAttribute('role','group');figure.setAttribute('aria-roledescription','slide');figure.setAttribute('aria-label','Post '+(index+1)+' of '+total);
    const isAlbum=post.mediaType==='CAROUSEL_ALBUM';const item=isAlbum && post.children?.length ? post.children[0] : post;
    const isVideo=item.mediaType==='VIDEO',source=mediaUrl(item.mediaUrl);
    const thumbnail=mediaUrl(item.sizes?.medium?.mediaUrl || item.sizes?.small?.mediaUrl || item.thumbnailUrl || (isVideo ? '' : item.mediaUrl));
    const caption=document.createElement('figcaption'),kind=document.createElement('span');kind.className='post-kind';kind.textContent=isAlbum?'CAROUSEL':isVideo?(post.isReel?'REEL':'VIDEO'):'PHOTO';caption.append(kind);
    const text=post.prunedCaption || post.caption;
    if(text){const p=document.createElement('p');p.className='post-caption';p.textContent=text;caption.append(p);}
    caption.append(link(postUrl(post.permalink)||'https://www.instagram.com/'+handle+'/',post.permalink?'View original post':'View profile','post-original'));
    const note=document.createElement('p');note.className='post-media-note';note.textContent='View the original post to see this media.';note.hidden=true;caption.append(note);
    const unavailable=()=>{figure.classList.add('media-unavailable');note.hidden=false;};
    if(isVideo && source){
      const video=document.createElement('video');video.controls=true;video.playsInline=true;video.preload='none';video.src=source;
      video.muted=true;video.defaultMuted=true;video.loop=true;video.setAttribute('muted','');video.setAttribute('playsinline','');
      video.dataset.autoplayReel=String(Boolean(post.isReel || item.isReel));
      if(thumbnail)video.poster=thumbnail;video.setAttribute('aria-label',(post.isReel?'Reel':'Video')+' by @'+handle);
      video.addEventListener('error',()=>{video.pause();unavailable();});figure.append(video);videos.add(video);
      if(videoObserver)videoObserver.observe(video);else video.dataset.viewportVisible='false';
    }else if(thumbnail){
      const a=document.createElement('button');a.type='button';a.className='post-image-link';a.setAttribute('aria-label','View photo by @'+handle);a.addEventListener('click',()=>openPost(post,handle));
      const img=document.createElement('img');img.src=thumbnail;img.alt=item.altText || post.altText || 'Photo by @'+handle;img.loading='lazy';img.decoding='async';img.addEventListener('error',unavailable);a.append(img);figure.append(a);
    }else unavailable();
    const expand=document.createElement('button');expand.type='button';expand.className='post-expand';expand.textContent='Expand';expand.setAttribute('aria-label','Open post details');expand.addEventListener('click',()=>openPost(post,handle));figure.append(expand,caption);return figure;
  }
  function renderCarousel(box,handle,posts){
    const previousIndex=Number(box.querySelector('.post-carousel')?.dataset.activeIndex)||0;
    cleanupByBox.get(box)?.();
    const carousel=document.createElement('div');carousel.className='post-carousel';carousel.setAttribute('role','region');carousel.setAttribute('aria-roledescription','carousel');carousel.setAttribute('aria-label','Recent posts from @'+handle);
    carousel.dataset.activeIndex=String(Math.min(previousIndex,posts.length-1));
    const track=document.createElement('div');track.className='post-carousel-track';track.tabIndex=0;track.setAttribute('aria-label','Swipe or use arrow keys to browse posts');
    const slides=posts.map((post,index)=>renderPost(post,handle,index,posts.length));slides.forEach(slide=>track.append(slide));
    const controls=document.createElement('div');controls.className='post-carousel-controls';
    const prev=document.createElement('button'),next=document.createElement('button');prev.type=next.type='button';prev.className=next.className='carousel-arrow';prev.textContent='Previous';next.textContent='Next';prev.setAttribute('aria-label','Previous post');next.setAttribute('aria-label','Next post');
    const dots=document.createElement('div');dots.className='carousel-dots';dots.setAttribute('aria-label','Choose a post');
    const buttons=posts.map((_,i)=>{const button=document.createElement('button');button.type='button';button.className='carousel-dot';button.setAttribute('aria-label','Go to post '+(i+1));button.addEventListener('click',()=>go(i));dots.append(button);return button;});
    const counter=document.createElement('p');counter.className='carousel-count';counter.setAttribute('role','status');counter.setAttribute('aria-live','polite');
    controls.append(prev,dots,next);carousel.append(track,controls,counter);box.replaceChildren(carousel);setStatus(box,'Recent posts ·');
    let active=Math.min(previousIndex,posts.length-1),frame=0;
    function update(index){active=index;carousel.dataset.activeIndex=String(active);slides.forEach((slide,i)=>{slide.inert=i!==active;slide.setAttribute('aria-hidden',String(i!==active));});buttons.forEach((button,i)=>button.setAttribute('aria-current',String(i===active)));prev.disabled=active===0;next.disabled=active===posts.length-1;counter.textContent=(active+1)+' / '+posts.length;updateVideos();}
    function go(index){const i=Math.max(0,Math.min(posts.length-1,index));track.scrollTo({left:track.clientWidth*i,behavior:reducedMotion.matches?'auto':'smooth'});}
    prev.addEventListener('click',()=>go(active-1));next.addEventListener('click',()=>go(active+1));
    track.addEventListener('keydown',event=>{if(event.target.closest('video'))return;if(event.key==='ArrowRight'){event.preventDefault();go(active+1);}if(event.key==='ArrowLeft'){event.preventDefault();go(active-1);}});
    track.addEventListener('scroll',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>update(Math.max(0,Math.min(posts.length-1,Math.round(track.scrollLeft/Math.max(1,track.clientWidth))))));},{passive:true});
    const resize='ResizeObserver' in window ? new ResizeObserver(()=>{track.scrollLeft=track.clientWidth*active;update(active);}) : null;resize?.observe(track);
    update(active);requestAnimationFrame(()=>{track.scrollLeft=track.clientWidth*active;update(active);});
    cleanupByBox.set(box,()=>{resize?.disconnect();cancelAnimationFrame(frame);carousel.querySelectorAll('video').forEach(video=>{video.pause();videoObserver?.unobserve(video);videos.delete(video);});});
  }
  function emptyBox(handle){
    const box=document.createElement('div');box.className='instagram-preview social-carousel-slot';box.dataset.profileHandle=handle;
    const empty=document.createElement('div');empty.className='social-empty';
    const label=document.createElement('p');label.className='eyebrow';label.textContent='RECENT POSTS';
    const p=document.createElement('p');p.textContent='View the latest photos and reels from @'+handle+'.';
    empty.append(label,p,link('https://www.instagram.com/'+handle+'/','View on Instagram','text-link'));box.append(empty);return box;
  }
  async function managedPreview(box,handle,feedId,localPosts){
    box.dataset.feedProvider=feedId?'behold':'local';box.setAttribute('aria-busy','true');
    try{
      const posts=feedId?await feedData(handle,feedId):localPosts.slice(0,MAX_POSTS);
      if(!posts.length){cleanupByBox.get(box)?.();box.replaceChildren(...emptyBox(handle).childNodes);setStatus(box,'No posts available.');return;}
      const signature=JSON.stringify(posts);
      if(box.dataset.postSignature!==signature){renderCarousel(box,handle,posts);box.dataset.postSignature=signature;}
    }catch{setStatus(box,'Posts unavailable.');}
    finally{box.removeAttribute('aria-busy');}
  }
  async function hydrate(box){
    if(initialized.has(box))return;initialized.add(box);
    const handle=box.dataset.profileHandle;if(!handle)return;
    const settings=(await config).accounts?.[handle];const feedId=settings?.feedId;
    if(typeof feedId==='string' && feedId.trim())await managedPreview(box,handle,feedId.trim());
    else if(Array.isArray(settings?.localPosts) && settings.localPosts.length)await managedPreview(box,handle,null,settings.localPosts);
  }
  const boxes=document.querySelectorAll('.instagram-preview');
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){hydrate(entry.target);observer.unobserve(entry.target);}}),{rootMargin:'400px'});boxes.forEach(box=>observer.observe(box));}else boxes.forEach(hydrate);
  document.querySelectorAll('[data-social-profile]').forEach(button=>button.addEventListener('click',()=>{
    document.querySelectorAll('[data-social-profile]').forEach(other=>{other.classList.toggle('active',other===button);other.setAttribute('aria-pressed',String(other===button));});
    const old=document.querySelector('#selected-social-preview .instagram-preview');if(old)cleanupByBox.get(old)?.();
    const handle=button.dataset.socialProfile,name=button.dataset.profileName,box=emptyBox(handle);document.querySelector('#selected-social-preview').replaceChildren(box);
    document.querySelector('#selected-social-name').textContent=name+' · @'+handle;document.querySelector('#selected-portfolio-link').href=button.dataset.portfolioUrl;hydrate(box);
  }));
  async function refreshVisibleFeeds(){
    if(document.hidden)return;const settings=await config;
    document.querySelectorAll('[data-feed-provider="behold"]').forEach(box=>{const rect=box.getBoundingClientRect(),handle=box.dataset.profileHandle,feedId=settings.accounts?.[handle]?.feedId;if(rect.bottom>0 && rect.top<innerHeight && feedId)managedPreview(box,handle,feedId);});
  }
  setInterval(refreshVisibleFeeds,REFRESH_MS);document.addEventListener('visibilitychange',refreshVisibleFeeds);
})();
