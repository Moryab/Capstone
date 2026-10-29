import { gsap, prefiereSinMovimiento } from '../landing/animaciones.js'

const COLORES_CONFETI = ['#3fd1b8', '#12766b', '#f2c94c', '#0e2440', '#9be7da']

// Confeti sutil desde el centro del contenedor. Con «reducir movimiento» no se muestra
export function lanzarConfeti(contenedor) {
  if (!contenedor || prefiereSinMovimiento()) return
  const piezas = COLORES_CONFETI.flatMap((color) =>
    Array.from({ length: 6 }, () => {
      const pieza = document.createElement('span')
      pieza.className = 'i-confeti'
      pieza.style.background = color
      contenedor.appendChild(pieza)
      return pieza
    }),
  )
  const azar = gsap.utils.random
  gsap.timeline({ onComplete: () => piezas.forEach((p) => p.remove()) })
    .fromTo(piezas,
      { x: 0, y: 0, rotation: 0, opacity: 1, scale: () => azar(0.6, 1.1) },
      { x: () => azar(-130, 130), y: () => azar(-120, -30), rotation: () => azar(-240, 240), duration: 0.8, ease: 'power3.out' })
    .to(piezas, { y: '+=110', opacity: 0, duration: 0.9, ease: 'power1.in' }, '-=0.15')
}
