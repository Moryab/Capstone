import { useEffect, useState } from 'react'
import { api } from '../../../api.js'

// Respuestas recientes por consulta: varias tarjetas con el mismo período comparten una sola petición
const cache = new Map()
const VIGENCIA_MS = 30000

export function pedir(consulta) {
  const guardada = cache.get(consulta)
  if (guardada && Date.now() - guardada.hora < VIGENCIA_MS) return guardada.promesa
  const promesa = api(`/admin/estadisticas${consulta ? `?${consulta}` : ''}`)
  cache.set(consulta, { promesa, hora: Date.now() })
  promesa.catch(() => cache.delete(consulta))
  return promesa
}

// EP-08: lo que aprendió el algoritmo. No depende del período ni de la ciudad
let algoritmo = null
export function pedirAlgoritmo() {
  if (algoritmo && Date.now() - algoritmo.hora < VIGENCIA_MS) return algoritmo.promesa
  const promesa = api('/admin/estadisticas/algoritmo')
  algoritmo = { promesa, hora: Date.now() }
  promesa.catch(() => { algoritmo = null })
  return promesa
}

/** Datos de «Aprendizaje del algoritmo»; solo los pide la tarjeta que los usa (`activo`) */
export function useAlgoritmo(activo) {
  const [estado, setEstado] = useState({ datos: null, error: '' })
  useEffect(() => {
    if (!activo) return undefined
    let vigente = true
    pedirAlgoritmo()
      .then((datos) => vigente && setEstado({ datos, error: '' }))
      .catch((err) => vigente && setEstado({ datos: null, error: err.message }))
    return () => {
      vigente = false
    }
  }, [activo])
  return { ...estado, cargando: false }
}

/** Arma la consulta (?desde=…&hasta=…&ciudad=…) sin los valores vacíos */
export function consultaDe({ desde, hasta, ciudad }) {
  const p = new URLSearchParams()
  if (desde) p.set('desde', desde)
  if (hasta) p.set('hasta', hasta)
  if (ciudad) p.set('ciudad', ciudad)
  return p.toString()
}

/**
 * Datos de estadísticas para una consulta. Mientras llega la nueva respuesta se sigue mostrando la
 * anterior (`cargando` en true), así los gráficos pasan al valor nuevo en vez de vaciarse.
 */
export function useEstadisticas(consulta) {
  const [estado, setEstado] = useState({ consulta: null, datos: null, error: '', errores: {} })
  useEffect(() => {
    let vigente = true
    pedir(consulta)
      .then((datos) => vigente && setEstado({ consulta, datos, error: '', errores: {} }))
      .catch((err) => vigente && setEstado((e) => ({ ...e, consulta, error: err.errores ? '' : err.message, errores: err.errores ?? {} })))
    return () => {
      vigente = false
    }
  }, [consulta])
  return { ...estado, cargando: estado.consulta !== consulta }
}

// ---------- Exportar a CSV ----------
// Separador «;» y BOM: así Excel en español lo abre en columnas y con los tildes bien
const celda = (valor) => {
  const texto = valor == null ? '' : String(valor)
  return /[";\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto
}
export const aCsv = (filas) => filas.map((fila) => fila.map(celda).join(';')).join('\r\n')

export function descargarCsv(nombre, filas) {
  const blob = new Blob([`﻿${aCsv(filas)}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.append(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Para el nombre del archivo: «San Pedro de la Paz» → «san-pedro-de-la-paz»
export const slug = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
