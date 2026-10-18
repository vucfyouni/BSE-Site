(() => {
  const sections=document.querySelectorAll('.ambient-section:not([hidden])');
  const galleries=document.querySelectorAll('[data-portfolio-gallery]');
  if(!sections.length && !galleries.length)return;
  function localAsset(value){
    if(typeof value!=='string'||!value)return null;
    try{const url=new URL(value,location.href);return url.origin===location.origin && url.pathname.startsWith(new URL('assets/',location.href).pathname) ? url.href : null;}catch{return null;}
  }
  function makeLightbox(items,name){
    const dialog=document.createElement('dialog');dialog.className='portfolio-lightbox';dialog.setAttribute('aria-label',name+' photography viewer');
    const close=document.createElement('button');close.type='button';close.className='lightbox-close';close.textContent='Close';close.setAttribute('aria-label','Close image viewer');
    const image=document.createElement('img');image.className='lightbox-image';image.alt='';
    const status=document.createElement('p');status.className='lightbox-caption';status.setAttribute('role','status');
    const controls=document.createElement('div');controls.className='lightbox-controls';
    const prev=document.createElement('button'),next=document.createElement('button');prev.type=next.type='button';prev.textContent='Previous';next.textContent='Next';prev.setAttribute('aria-label','Previous photograph');next.setAttribute('aria-label','Next photograph');
    controls.append(prev,status,next);dialog.append(close,image,controls);document.body.append(dialog);
    let current=0;
    function show(index){current=(index+items.length)%items.length;const item=items[current];image.src=localAsset(item.fullSrc)||item.src;image.alt=item.alt||'Photograph by '+name;status.textContent=(item.caption?item.caption+' · ':'')+(current+1)+' / '+items.length;prev.disabled=next.disabled=items.length<2;}
    close.addEventListener('click',()=>dialog.close());prev.addEventListener('click',()=>show(current-1));next.addEventListener('click',()=>show(current+1));
    dialog.addEventListener('keydown',event=>{if(event.key==='ArrowRight'){event.preventDefault();show(current+1);}if(event.key==='ArrowLeft'){event.preventDefault();show(current-1);}});
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();});
    dialog.addEventListener('close',()=>document.body.classList.remove('lightbox-open'));
    image.addEventListener('error',()=>{status.textContent='This photograph could not be loaded. '+(current+1)+' / '+items.length;});
    return index=>{show(index);dialog.showModal();document.body.classList.add('lightbox-open');};
  }
  fetch('assets/portfolio-media.json',{cache:'no-cache'}).then(response=>response.ok?response.json():null).then(data=>{
    if(!data)return;
    const backgrounds=(data.crowdBackgrounds||[]).map(item=>localAsset(typeof item==='string'?item:item.src)).filter(Boolean);
    if(backgrounds.length)sections.forEach((section,index)=>section.style.setProperty('--section-crowd-image','url('+JSON.stringify(backgrounds[index%backgrounds.length])+')'));
    galleries.forEach(section=>{
      const portfolio=data.portfolios?.[section.dataset.portfolioGallery];
      const items=(portfolio?.images||[]).map(item=>({...item,src:localAsset(item.src)})).filter(item=>item.src);
      if(!items.length)return;
      const grid=section.querySelector('.portfolio-photo-grid'),open=makeLightbox(items,portfolio.name||'the contributor');
      items.forEach((item,index)=>{
        const figure=document.createElement('figure');figure.className='portfolio-photo';
        const button=document.createElement('button');button.type='button';button.setAttribute('aria-label','Open photograph '+(index+1)+' by '+(portfolio.name||'the contributor'));
        const image=document.createElement('img');image.src=item.src;image.alt=item.alt||'Photograph by '+(portfolio.name||'the contributor');image.loading='lazy';image.decoding='async';
        if(Number.isFinite(item.width)&&item.width>0)image.width=item.width;if(Number.isFinite(item.height)&&item.height>0)image.height=item.height;
        button.append(image);button.addEventListener('click',()=>open(index));figure.append(button);
        if(item.caption){const caption=document.createElement('figcaption');caption.textContent=item.caption;figure.append(caption);}grid.append(figure);
      });
      grid.hidden=false;const placeholder=section.querySelector('.portfolio-asset-status');if(placeholder)placeholder.hidden=true;
    });
  }).catch(()=>{});
})();
