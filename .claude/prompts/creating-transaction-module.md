# Новая функциональность - создай модуль транзакций

## Контекст

Что уже есть: модуль user, category и авторизация.

## Задача

Создай Transaction Module - центральный модуль приложения для учета доходов и расходов

## Модель данных

Добавь модель Transaction в schema.prisma:

id (String, uuid, @default(uuid()))
amount (Decimal)
type (Enum: INCOME, EXPENSE)
description (String, nullable)
date (DateTime)
categoryId (String, связь с Category)
userId (String, связь с User)
createdAt (DateTime, @default(now()))

Обнови модели User и Category — добавь обратные связи transactions Transaction[]
После изменения схемы создай и примени миграцию: npx prisma migrate dev --name add-transactions

## Контроллер

Эндпоинты:

POST /transactions: создать транзакцию
GET /transactions: список с query параметрами dateFrom, dateTo, type, categoryId (по пользователю)
GET /transactions/summary: агрегация, query параметры month и year (оба обязательные)
GET /transactions/:id: одна транзакция
PATCH /transactions/:id: обновить
DELETE /transactions/:id: удалить

## Паттерн

Используй @apps/backend/src/category как образец структуры модулей для backend

## Ограничения

- Не добавлять зависимости, если не указано в задаче
- После реализации собирай проект
