'use client'

import {
    addDays,
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    endOfYear,
    format,
    isAfter,
    isBefore,
    isSameDay,
    isSameMonth,
    isWithinInterval,
    startOfDay,
    startOfMonth,
    startOfWeek,
    startOfYear,
    subMonths
} from 'date-fns'
import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
    type ReactElement
} from 'react'

export type DatePickerMode = 'single' | 'range'
export type DateRangeValue = { start: Date | null; end: Date | null }
export type DatePickerValue = Date | DateRangeValue | null

type QuickFilterKey = 'thisYear' | 'last7' | 'last14' | 'last30'

interface DatePickerProps {
    mode?: DatePickerMode
    value?: DatePickerValue | [Date | null, Date | null]
    defaultValue?: DatePickerValue | [Date | null, Date | null]
    onChange?: (value: DatePickerValue) => void
    showQuickFilters?: boolean
    className?: string
    ariaLabel?: string
}

type QuickFilterOption = {
    key: QuickFilterKey
    label: string
    description: string
}

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const normalizeDate = (input: Date | string | null | undefined): Date | null => {
    if (!input) return null
    const value = input instanceof Date ? input : new Date(input)
    const safe = startOfDay(value)
    if (Number.isNaN(safe.getTime())) return null
    return safe
}

const orderRange = (range: DateRangeValue): DateRangeValue => {
    const { start, end } = range
    if (start && end && isAfter(start, end)) {
        return { start: end, end: start }
    }
    return { start, end }
}

const normalizeValue = (
    rawValue: DatePickerProps['value'],
    mode: DatePickerMode
): { range: DateRangeValue; single: Date | null; focusDate: Date } => {
    const today = startOfDay(new Date())

    if (rawValue === undefined || rawValue === null) {
        return { range: { start: null, end: null }, single: null, focusDate: today }
    }

    if (rawValue instanceof Date || typeof rawValue === 'string') {
        const safeDate = normalizeDate(rawValue) ?? today
        return {
            range: mode === 'range' ? { start: safeDate, end: safeDate } : { start: null, end: null },
            single: mode === 'single' ? safeDate : null,
            focusDate: safeDate
        }
    }

    if (Array.isArray(rawValue)) {
        const [start, end] = rawValue
        const ordered = orderRange({ start: normalizeDate(start), end: normalizeDate(end) })
        const focusDate = ordered.start ?? ordered.end ?? today
        return {
            range: mode === 'range' ? ordered : { start: null, end: null },
            single: mode === 'single' ? ordered.start ?? ordered.end ?? null : null,
            focusDate
        }
    }

    if (typeof rawValue === 'object' && 'start' in rawValue) {
        const maybeRange = rawValue as DateRangeValue
        const ordered = orderRange({
            start: normalizeDate(maybeRange.start),
            end: normalizeDate(maybeRange.end)
        })
        const focusDate = ordered.start ?? ordered.end ?? today
        return {
            range: mode === 'range' ? ordered : { start: null, end: null },
            single: mode === 'single' ? ordered.start ?? ordered.end ?? null : null,
            focusDate
        }
    }

    return { range: { start: null, end: null }, single: null, focusDate: today }
}

const buildQuickOption = (key: QuickFilterKey): DateRangeValue => {
    const today = startOfDay(new Date())
    switch (key) {
        case 'thisYear':
            return { start: startOfYear(today), end: endOfYear(today) }
        case 'last7':
            return { start: addDays(today, -6), end: today }
        case 'last14':
            return { start: addDays(today, -13), end: today }
        case 'last30':
            return { start: addDays(today, -29), end: today }
        default:
            return { start: null, end: null }
    }
}

const formatReadable = (date: Date | null): string => (date ? format(date, 'dd MMM yyyy') : '--')

const cn = (...classes: Array<string | false | null | undefined>): string =>
    classes.filter(Boolean).join(' ')

const DatePicker = ({
    mode = 'range',
    value,
    defaultValue,
    onChange,
    showQuickFilters = false,
    className,
    ariaLabel = 'Date picker'
}: DatePickerProps): ReactElement => {
    const normalized = useMemo(
        () => normalizeValue(value ?? defaultValue ?? null, mode),
        [defaultValue, mode, value]
    )
    const [rangeSelection, setRangeSelection] = useState<DateRangeValue>(normalized.range)
    const [singleSelection, setSingleSelection] = useState<Date | null>(normalized.single)
    const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(normalized.focusDate))
    const [focusedDate, setFocusedDate] = useState<Date>(normalized.focusDate)
    const [hoveredDate, setHoveredDate] = useState<Date | null>(null)
    const [quickOpen, setQuickOpen] = useState(false)
    const [activePreset, setActivePreset] = useState<QuickFilterKey | null>(null)
    const [dragStart, setDragStart] = useState<Date | null>(null)
    const [dragEnd, setDragEnd] = useState<Date | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const focusRef = useRef<HTMLButtonElement | null>(null)
    const dropdownRef = useRef<HTMLDivElement | null>(null)
    const dragAppliedRef = useRef(false)

    useEffect(() => {
        if (value === undefined) return
        const next = normalizeValue(value, mode)
        setRangeSelection(next.range)
        setSingleSelection(next.single)
        setFocusedDate(next.focusDate)
        setCurrentMonth(startOfMonth(next.focusDate))
    }, [mode, value])

    useEffect(() => {
        if (value !== undefined) return
        if (defaultValue === undefined) return
        const next = normalizeValue(defaultValue, mode)
        setRangeSelection(next.range)
        setSingleSelection(next.single)
        setFocusedDate(next.focusDate)
        setCurrentMonth(startOfMonth(next.focusDate))
    }, [defaultValue, mode, value])

    useEffect(() => {
        if (!quickOpen) return
        const handleClick = (event: MouseEvent) => {
            if (dropdownRef.current && event.target instanceof Node && !dropdownRef.current.contains(event.target)) {
                setQuickOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [quickOpen])

    useEffect(() => {
        if (focusRef.current) {
            focusRef.current.focus()
        }
    }, [focusedDate, currentMonth])

    const calendarDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 })
        const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 })
        return eachDayOfInterval({ start, end })
    }, [currentMonth])

    const activeRange = useMemo(() => {
        if (mode !== 'range') return { start: null, end: null }

        if (isDragging && dragStart) {
            const endCandidate = dragEnd ?? dragStart
            return orderRange({ start: dragStart, end: endCandidate })
        }

        if (!rangeSelection.start) return { start: null, end: null }

        const endCandidate = rangeSelection.end ?? hoveredDate ?? rangeSelection.start
        return orderRange({ start: rangeSelection.start, end: endCandidate })
    }, [dragEnd, dragStart, hoveredDate, isDragging, mode, rangeSelection.end, rangeSelection.start])

    const setMonth = (direction: -1 | 1): void => {
        setCurrentMonth((prev) => addMonths(prev, direction))
        setFocusedDate((prev) => addMonths(prev, direction))
    }

    const applyRangeChange = (nextRange: DateRangeValue, preset: QuickFilterKey | null = null) => {
        const ordered = orderRange(nextRange)
        setRangeSelection(ordered)
        const anchor = ordered.end ?? ordered.start ?? startOfDay(new Date())
        setFocusedDate(anchor)
        setCurrentMonth(startOfMonth(anchor))
        setActivePreset(preset)
        onChange?.(ordered)
    }

    const applySingleChange = (nextDate: Date, preset: QuickFilterKey | null = null) => {
        setSingleSelection(nextDate)
        setFocusedDate(nextDate)
        setCurrentMonth(startOfMonth(nextDate))
        setActivePreset(preset)
        onChange?.(nextDate)
    }

    const computeNextRange = (selected: DateRangeValue, day: Date): DateRangeValue => {
        if (!selected.start || (selected.start && selected.end)) {
            return { start: day, end: null }
        }

        if (isBefore(day, selected.start)) {
            return { start: day, end: null }
        }

        if (isSameDay(day, selected.start)) {
            return { start: day, end: day }
        }

        return { start: selected.start, end: day }
    }

    const handleDaySelect = (day: Date) => {
        const normalizedDay = startOfDay(day)
        if (mode === 'single') {
            applySingleChange(normalizedDay)
            return
        }

        const nextRange = computeNextRange(rangeSelection, normalizedDay)
        applyRangeChange(nextRange)
    }

    const moveFocusBy = (days: number) => {
        setFocusedDate((prev) => {
            const base = prev ?? startOfDay(new Date())
            const next = addDays(base, days)
            setCurrentMonth((curr) => (isSameMonth(next, curr) ? curr : startOfMonth(next)))
            return next
        })
    }

    const handleDayKeyDown = (event: KeyboardEvent<HTMLButtonElement>, day: Date) => {
        switch (event.key) {
            case 'ArrowLeft':
                event.preventDefault()
                moveFocusBy(-1)
                break
            case 'ArrowRight':
                event.preventDefault()
                moveFocusBy(1)
                break
            case 'ArrowUp':
                event.preventDefault()
                moveFocusBy(-7)
                break
            case 'ArrowDown':
                event.preventDefault()
                moveFocusBy(7)
                break
            case 'PageUp':
                event.preventDefault()
                setMonth(-1)
                break
            case 'PageDown':
                event.preventDefault()
                setMonth(1)
                break
            case 'Enter':
            case ' ':
                event.preventDefault()
                handleDaySelect(day)
                break
            default:
                break
        }
    }

    const handleQuickSelect = (option: QuickFilterOption) => {
        const range = buildQuickOption(option.key)
        if (mode === 'single') {
            const targetDate = range.end ?? range.start ?? startOfDay(new Date())
            applySingleChange(targetDate, option.key)
        } else {
            applyRangeChange(range, option.key)
        }
        setQuickOpen(false)
    }

    const quickFilters: QuickFilterOption[] = useMemo(
        () => [
            { key: 'thisYear', label: 'This Year', description: 'Jan 1 - Dec 31' },
            { key: 'last7', label: 'Last 7 Days', description: 'Through today' },
            { key: 'last14', label: 'Last 14 Days', description: 'Through today' },
            { key: 'last30', label: 'Last 30 Days', description: 'Through today' }
        ],
        []
    )

    const handleDayMouseDown = (day: Date) => {
        if (mode !== 'range') return
        const normalizedDay = startOfDay(day)
        setIsDragging(true)
        dragAppliedRef.current = false
        setDragStart(normalizedDay)
        setDragEnd(normalizedDay)
    }

    const handleDayMouseEnter = (day: Date) => {
        if (mode === 'range' && isDragging && dragStart) {
            setDragEnd(startOfDay(day))
        }
        if (!isDragging) {
            setHoveredDate(day)
        }
    }

    const handleDayMouseLeave = () => {
        if (!isDragging) {
            setHoveredDate(null)
        }
    }

    const finalizeDragSelection = (day: Date) => {
        if (mode !== 'range' || !isDragging || !dragStart) return
        const normalizedDay = startOfDay(day)
        applyRangeChange({ start: dragStart, end: normalizedDay })
        dragAppliedRef.current = true
        setIsDragging(false)
        setDragStart(null)
        setDragEnd(null)
        setHoveredDate(null)
    }

    return (
        <div className={cn('space-y-4 p-3', className)}>
            {showQuickFilters ? (
                <div className="relative" ref={dropdownRef}>
                    <button
                        type="button"
                        onClick={() => setQuickOpen((prev) => !prev)}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                        aria-haspopup="menu"
                        aria-expanded={quickOpen}
                    >
                        <span>Date Range Filter</span>
                        <span className="text-slate-500">{quickOpen ? '▴' : '▾'}</span>
                    </button>
                    {quickOpen ? (
                        <div
                            className="absolute right-0 z-20 mt-3 w-full min-w-[240px] max-w-xs rounded-2xl border border-slate-200 bg-white p-3 shadow-xl ring-1 ring-slate-100"
                            role="menu"
                        >
                            <div className="divide-y divide-slate-100">
                                {quickFilters.map((option) => (
                                    <button
                                        key={option.key}
                                        type="button"
                                        onClick={() => handleQuickSelect(option)}
                                        className={cn(
                                            'flex w-full flex-col rounded-xl px-3 py-2 text-left transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500',
                                            activePreset === option.key ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'text-slate-800'
                                        )}
                                        role="menuitem"
                                    >
                                        <span className="text-sm font-semibold">{option.label}</span>
                                        <span className="text-xs text-slate-500">{option.description}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                        onClick={() => setMonth(-1)}
                        aria-label="Previous month"
                    >
                        &lt;
                    </button>
                    <div className="text-sm font-semibold text-slate-800" aria-live="polite">
                        {format(currentMonth, 'MMMM yyyy')}
                    </div>
                    <button
                        type="button"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
                        onClick={() => setMonth(1)}
                        aria-label="Next month"
                    >
                        &gt;
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {weekdayLabels.map((day) => (
                        <span key={day}>{day}</span>
                    ))}
                </div>

                <div
                    className="mt-3 grid grid-cols-7 gap-2 text-sm"
                    role="grid"
                    aria-label={ariaLabel}
                >
                    {calendarDays.map((day) => {
                        const key = format(day, 'yyyy-MM-dd')
                        const isOutOfMonth = !isSameMonth(day, currentMonth)
                        const isRangeStart =
                            mode === 'range' && activeRange.start ? isSameDay(day, activeRange.start) : false
                        const isRangeEnd = mode === 'range' && activeRange.end ? isSameDay(day, activeRange.end) : false
                        const isInRange =
                            mode === 'range' && activeRange.start && activeRange.end
                                ? isWithinInterval(day, { start: activeRange.start, end: activeRange.end })
                                : false
                        const isSingleSelected =
                            mode === 'single' && singleSelection ? isSameDay(day, singleSelection) : false
                        const isFocusTarget = isSameDay(day, focusedDate)

                        const buttonClass = cn(
                            'relative flex h-9 w-9 items-center justify-center rounded-full font-medium transition',
                            isOutOfMonth ? 'text-slate-400' : 'text-slate-700',
                            isInRange ? 'bg-blue-50 text-blue-700' : '',
                            (isRangeStart || isRangeEnd || isSingleSelected) && 'bg-blue-600 text-white hover:bg-blue-600',
                            !isRangeStart && !isRangeEnd && !isSingleSelected && 'hover:bg-blue-50',
                            isFocusTarget && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white focus-visible:outline-none'
                        )

                        const ariaSelected = mode === 'single' ? isSingleSelected : isRangeStart || isRangeEnd

                        return (
                            <button
                                key={key}
                                type="button"
                                ref={isFocusTarget ? focusRef : null}
                                className={buttonClass}
                                onClick={() => {
                                    if (dragAppliedRef.current) {
                                        dragAppliedRef.current = false
                                        return
                                    }
                                    handleDaySelect(day)
                                }}
                                onMouseDown={() => handleDayMouseDown(day)}
                                onMouseEnter={() => handleDayMouseEnter(day)}
                                onMouseLeave={handleDayMouseLeave}
                                onMouseUp={() => finalizeDragSelection(day)}
                                onKeyDown={(event) => handleDayKeyDown(event, day)}
                                aria-label={format(day, 'PPPP')}
                                aria-pressed={ariaSelected}
                                tabIndex={isFocusTarget ? 0 : -1}
                                role="gridcell"
                            >
                                {format(day, 'd')}
                            </button>
                        )
                    })}
                </div>

            </div>
        </div>
    )
}

export default DatePicker

