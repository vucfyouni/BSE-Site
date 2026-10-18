(() => {
 const form=document.querySelector('#booking-form');if(!form)return;
 const fields=['service','sets','attendees','capacity','photographers','videographers','delivery','audio'];
 const get=name=>form.elements.namedItem(name);
 const number=(name,fallback=1)=>Math.max(0,Math.min(name==='attendees'||name==='capacity'?100000:12,Number(get(name)?.value)||fallback));
 function snapshot(){
  const service=get('service').value,photo=['Photography','Photo + video'].includes(service),video=['Videography','Photo + video'].includes(service);
  if(!photo&&!video)return null;
  const sets=Math.max(1,number('sets')),attendees=number('attendees',0),capacity=number('capacity',attendees)||attendees;
  const photoCount=photo?Math.max(attendees>300?2:1,number('photographers')):0,videoCount=video?Math.max(1,number('videographers')):0;
  const rate=capacity>400?40:15,blocks=Math.ceil(attendees/100),crew=50*(photoCount+videoCount)*sets,crowd=blocks*rate*sets;
  return {service,sets,attendees,capacity,photoCount,videoCount,rate,blocks,crew,crowd,total:crew+crowd,delivery:get('delivery').value,audio:get('audio').checked};
 }
 function render(){
  const quote=snapshot();const photo=quote?.photoCount>0,video=quote?.videoCount>0;
  get('photographers').disabled=!photo;get('videographers').disabled=!video;
  document.querySelector('#estimate-output').textContent=quote?'Starting estimate: $'+quote.total.toLocaleString():'Choose photography, videography, or both for an estimate.';
  document.querySelector('#estimate-breakdown').textContent=quote?`Crew: $${quote.crew} (${quote.photoCount} photographer${quote.photoCount===1?'':'s'}, ${quote.videoCount} videographer${quote.videoCount===1?'':'s'} × ${quote.sets} set${quote.sets===1?'':'s'}). Attendance: $${quote.crowd} (${quote.blocks} blocks of up to 100 × $${quote.rate} × ${quote.sets} set${quote.sets===1?'':'s'}).`:'';
  document.querySelector('#automatic-crew').textContent=quote&&photo&&quote.attendees>300?'A minimum of two photographers is included because expected attendance exceeds 300.':'';
  document.querySelector('#delivery-note').textContent='Editing, RAW delivery and '+(quote?.audio?'requested audio recording':'any audio recording')+' are quoted separately and are not included in this estimate.';
 }
 fields.forEach(name=>{get(name)?.addEventListener('input',render);get(name)?.addEventListener('change',render);});
 window.BSEQuote={snapshot,render,emailLines(){const q=snapshot();if(!q)return 'Estimate: scope to be discussed.';return `Starting coverage estimate: $${q.total}\nSets: ${q.sets}\nExpected attendees: ${q.attendees}\nVenue capacity used for rate: ${q.capacity}\nPhotography crew: ${q.photoCount}\nVideo crew: ${q.videoCount}\nCrew subtotal: $${q.crew}\nAttendance surcharge: $${q.crowd} ($${q.rate} per started 100 attendees, per set)\nDelivery preference: ${q.delivery}\nAudio recording requested: ${q.audio?'Yes':'No'}\nEditing/RAW/audio charges: not included; to be quoted separately.\nThis is a starting estimate and is subject to BSE confirmation.`;}};
 render();
})();
