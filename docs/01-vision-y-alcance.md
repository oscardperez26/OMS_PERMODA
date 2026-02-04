# Visión y alcance - OMS

## Objetivo
Describir el propósito del OMS, su alcance y lo que NO cubre.

## Contexto
- La base de datos ya existe y se alimenta mediante ETL (fuera del alcance del OMS).
- Existe un conjunto de APIs externas a consumir (fuera del OMS, pero el OMS las utiliza).
- El OMS se encarga de la lógica de negocio y el panel (UI) para operar pedidos y catálogo.

## Alcance funcional (módulos)
- Pedidos: listar, filtrar, ver detalle, cambiar estado (según reglas).
- Catálogo: productos, categorías, precios, inventario, imágenes (consulta y/o acciones definidas).
- Seguridad: login, roles, permisos, auditoría básica.

## Fuera de alcance
- Construcción o mantenimiento de ETL.
- Administración de infraestructura de BD.
- Modificación de sistemas externos (Centric, ICG, etc.).

## Usuarios/roles del sistema
- ADMIN: administración completa.
- OPERADOR: operación de pedidos (cambio de estado).
- CONSULTA: solo lectura.

## MVP propuesto
1. Login + roles
2. Listado de pedidos + filtros + paginación
3. Detalle de pedido
4. Cambio de estado de pedido
