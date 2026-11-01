'use strict';
const acceso = document.querySelector('.boton-horarios');
const dialogo = document.querySelector('#horarios-dialogo');
if (acceso && dialogo && typeof dialogo.showModal === 'function') {
 acceso.addEventListener('click', (evento) => { evento.preventDefault(); dialogo.showModal(); });
 dialogo.addEventListener('click', (evento) => {
  const caja = dialogo.getBoundingClientRect();
  if (evento.target === dialogo && (evento.clientX < caja.left || evento.clientX > caja.right || evento.clientY < caja.top || evento.clientY > caja.bottom)) dialogo.close();
 });
 dialogo.addEventListener('close', () => acceso.focus());
}
