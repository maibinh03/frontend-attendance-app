(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/lib/auth.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "USER_ROLES",
    ()=>USER_ROLES,
    "authUtils",
    ()=>authUtils
]);
'use client';
const USER_ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    USER: 'user'
};
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const authUtils = {
    setAuth: (token, user)=>{
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    getToken: ()=>{
        return localStorage.getItem(TOKEN_KEY);
    },
    getUser: ()=>{
        const userStr = localStorage.getItem(USER_KEY);
        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch  {
            return null;
        }
    },
    isAuthenticated: ()=>{
        return !!authUtils.getToken();
    },
    clearAuth: ()=>{
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    },
    getAuthHeader: ()=>{
        const token = authUtils.getToken();
        return token ? {
            Authorization: `Bearer ${token}`
        } : {};
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/lib/config.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BASE_URL",
    ()=>BASE_URL
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
const BASE_URL = ("TURBOPACK compile-time value", "http://localhost:3000");
console.log('BASE_URL:', BASE_URL);
if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/hooks/useRequireAuth.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useRequireAuth",
    ()=>useRequireAuth
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
const useRequireAuth = (options)=>{
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [user, setUser] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Create a stable dependency string from allowedRoles
    const allowedRolesKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "useRequireAuth.useMemo[allowedRolesKey]": ()=>{
            return options?.allowedRoles?.join(',') ?? '';
        }
    }["useRequireAuth.useMemo[allowedRolesKey]"], [
        options?.allowedRoles
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "useRequireAuth.useEffect": ()=>{
            if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
            ;
            const currentUser = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authUtils"].getUser();
            setUser(currentUser);
            if (!__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authUtils"].isAuthenticated()) {
                router.replace('/login');
                return;
            }
            if (!options?.allowedRoles || !currentUser?.role) return;
            if (!options.allowedRoles.includes(currentUser.role)) {
                if (currentUser.role === __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["USER_ROLES"].ADMIN) {
                    router.replace('/dashboard/admin');
                } else {
                    router.replace('/dashboard/user');
                }
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }
    }["useRequireAuth.useEffect"], [
        allowedRolesKey
    ]);
    return user;
};
_s(useRequireAuth, "JXenvev5/BHyY3X9vB4yNN8ZA0E=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/app/dashboard/user/page.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__,
    "dynamic",
    ()=>dynamic
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/auth.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/config.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$useRequireAuth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/hooks/useRequireAuth.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
'use client';
;
const dynamic = 'force-dynamic';
;
;
;
;
const formatTime = (date)=>date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
    });
const formatDate = (date)=>date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
const formatDateTime = (value)=>new Date(value).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
const formatTotalHours = (totalHours)=>{
    if (totalHours == null) return '0h';
    const num = typeof totalHours === 'string' ? parseFloat(totalHours) : totalHours;
    if (Number.isNaN(num)) return '0h';
    return `${num.toFixed(2)}h`;
};
const headerButtonStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    alignItems: 'flex-end'
};
const HistoryRow = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["memo"])(({ attendance })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('tr', null, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('td', null, formatDate(new Date(attendance.workDate))), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('td', null, attendance.checkInTime ? formatDateTime(attendance.checkInTime) : '--'), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('td', null, attendance.checkOutTime ? formatDateTime(attendance.checkOutTime) : '--'), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('td', null, formatTotalHours(attendance.totalHours)), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('td', null, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('span', {
        className: `ritzy-badge ${attendance.status}`
    }, attendance.status))));
_c = HistoryRow;
HistoryRow.displayName = 'HistoryRow';
const UserDashboardPage = ()=>{
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const currentUser = (0, __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$useRequireAuth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRequireAuth"])();
    const [currentTime, setCurrentTime] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "UserDashboardPage.useState": ()=>new Date()
    }["UserDashboardPage.useState"]);
    const [currentDate, setCurrentDate] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        "UserDashboardPage.useState": ()=>new Date()
    }["UserDashboardPage.useState"]);
    const lastDateRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(new Date().toDateString());
    const [todayAttendance, setTodayAttendance] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [attendanceHistory, setAttendanceHistory] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [isTodayLoading, setIsTodayLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isHistoryLoading, setIsHistoryLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isChecking, setIsChecking] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [showHistory, setShowHistory] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [message, setMessage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const messageTimeoutRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const formattedTime = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "UserDashboardPage.useMemo[formattedTime]": ()=>formatTime(currentTime)
    }["UserDashboardPage.useMemo[formattedTime]"], [
        currentTime
    ]);
    const formattedDate = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "UserDashboardPage.useMemo[formattedDate]": ()=>formatDate(currentDate)
    }["UserDashboardPage.useMemo[formattedDate]"], [
        currentDate
    ]);
    const pushMessage = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "UserDashboardPage.useCallback[pushMessage]": (payload)=>{
            if (messageTimeoutRef.current) {
                window.clearTimeout(messageTimeoutRef.current);
                messageTimeoutRef.current = null;
            }
            setMessage(payload);
            if (payload) {
                messageTimeoutRef.current = window.setTimeout({
                    "UserDashboardPage.useCallback[pushMessage]": ()=>{
                        setMessage(null);
                        messageTimeoutRef.current = null;
                    }
                }["UserDashboardPage.useCallback[pushMessage]"], 3200);
            }
        }
    }["UserDashboardPage.useCallback[pushMessage]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "UserDashboardPage.useEffect": ()=>{
            return ({
                "UserDashboardPage.useEffect": ()=>{
                    if (messageTimeoutRef.current) {
                        window.clearTimeout(messageTimeoutRef.current);
                    }
                }
            })["UserDashboardPage.useEffect"];
        }
    }["UserDashboardPage.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "UserDashboardPage.useEffect": ()=>{
            const timeTimer = window.setInterval({
                "UserDashboardPage.useEffect.timeTimer": ()=>{
                    const now = new Date();
                    setCurrentTime(now);
                    const nowDateStr = now.toDateString();
                    if (nowDateStr !== lastDateRef.current) {
                        lastDateRef.current = nowDateStr;
                        setCurrentDate(now);
                    }
                }
            }["UserDashboardPage.useEffect.timeTimer"], 60000);
            return ({
                "UserDashboardPage.useEffect": ()=>window.clearInterval(timeTimer)
            })["UserDashboardPage.useEffect"];
        }
    }["UserDashboardPage.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "UserDashboardPage.useEffect": ()=>{
            if (!currentUser) {
                router.replace('/login');
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }
    }["UserDashboardPage.useEffect"], [
        currentUser
    ]);
    const fetchTodayAttendance = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "UserDashboardPage.useCallback[fetchTodayAttendance]": async ()=>{
            if (!currentUser) return;
            setIsTodayLoading(true);
            try {
                const response = await fetch(`${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BASE_URL"]}/api/attendance/today`, {
                    headers: {
                        ...__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authUtils"].getAuthHeader(),
                        'Content-Type': 'application/json'
                    }
                });
                if (!response.ok) return;
                const data = await response.json();
                setTodayAttendance(data.data ?? null);
            } catch (err) {
                console.error('Error fetching today attendance:', err);
            } finally{
                setIsTodayLoading(false);
            }
        }
    }["UserDashboardPage.useCallback[fetchTodayAttendance]"], [
        currentUser
    ]);
    const fetchAttendanceHistory = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "UserDashboardPage.useCallback[fetchAttendanceHistory]": async ()=>{
            if (!currentUser) return;
            setIsHistoryLoading(true);
            try {
                const response = await fetch(`${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BASE_URL"]}/api/attendance/history?limit=10`, {
                    headers: {
                        ...__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authUtils"].getAuthHeader(),
                        'Content-Type': 'application/json'
                    }
                });
                if (!response.ok) return;
                const data = await response.json();
                setAttendanceHistory(data.data ?? []);
            } catch (err) {
                console.error('Error fetching attendance history:', err);
            } finally{
                setIsHistoryLoading(false);
            }
        }
    }["UserDashboardPage.useCallback[fetchAttendanceHistory]"], [
        currentUser
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "UserDashboardPage.useEffect": ()=>{
            if (!currentUser) return;
            fetchTodayAttendance();
        }
    }["UserDashboardPage.useEffect"], [
        currentUser,
        fetchTodayAttendance
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "UserDashboardPage.useEffect": ()=>{
            if (showHistory && currentUser) {
                fetchAttendanceHistory();
            }
        }
    }["UserDashboardPage.useEffect"], [
        showHistory,
        currentUser,
        fetchAttendanceHistory
    ]);
    const handleLogout = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "UserDashboardPage.useCallback[handleLogout]": ()=>{
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authUtils"].clearAuth();
            router.replace('/login');
        }
    }["UserDashboardPage.useCallback[handleLogout]"], [
        router
    ]);
    const handleCheckIn = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "UserDashboardPage.useCallback[handleCheckIn]": async ()=>{
            if (!currentUser || todayAttendance) {
                pushMessage({
                    type: 'error',
                    text: 'Bạn đã chấm công vào hôm nay rồi'
                });
                return;
            }
            setIsChecking(true);
            try {
                const response = await fetch(`${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BASE_URL"]}/api/attendance/checkin`, {
                    method: 'POST',
                    headers: {
                        ...__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authUtils"].getAuthHeader(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                });
                const data = await response.json().catch({
                    "UserDashboardPage.useCallback[handleCheckIn]": ()=>null
                }["UserDashboardPage.useCallback[handleCheckIn]"]);
                if (!response.ok) {
                    throw new Error(data?.message ?? 'Không thể chấm công vào');
                }
                pushMessage({
                    type: 'success',
                    text: 'Chấm công vào thành công!'
                });
                await fetchTodayAttendance();
                if (showHistory) {
                    await fetchAttendanceHistory();
                }
            } catch (err) {
                pushMessage({
                    type: 'error',
                    text: err instanceof Error ? err.message : 'Đã xảy ra lỗi khi chấm công vào'
                });
            } finally{
                setIsChecking(false);
            }
        }
    }["UserDashboardPage.useCallback[handleCheckIn]"], [
        currentUser,
        todayAttendance,
        pushMessage,
        fetchTodayAttendance,
        fetchAttendanceHistory,
        showHistory
    ]);
    const handleCheckOut = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "UserDashboardPage.useCallback[handleCheckOut]": async ()=>{
            if (!currentUser) return;
            if (!todayAttendance) {
                pushMessage({
                    type: 'error',
                    text: 'Bạn chưa chấm công vào hôm nay'
                });
                return;
            }
            if (todayAttendance.checkOutTime) {
                pushMessage({
                    type: 'error',
                    text: 'Bạn đã chấm công ra hôm nay rồi'
                });
                return;
            }
            setIsChecking(true);
            try {
                const response = await fetch(`${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$config$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BASE_URL"]}/api/attendance/checkout`, {
                    method: 'POST',
                    headers: {
                        ...__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$auth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["authUtils"].getAuthHeader(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                });
                const data = await response.json().catch({
                    "UserDashboardPage.useCallback[handleCheckOut]": ()=>null
                }["UserDashboardPage.useCallback[handleCheckOut]"]);
                if (!response.ok) {
                    throw new Error(data?.message ?? 'Không thể chấm công ra');
                }
                pushMessage({
                    type: 'success',
                    text: 'Chấm công ra thành công!'
                });
                await fetchTodayAttendance();
                if (showHistory) {
                    await fetchAttendanceHistory();
                }
            } catch (err) {
                pushMessage({
                    type: 'error',
                    text: err instanceof Error ? err.message : 'Đã xảy ra lỗi khi chấm công'
                });
            } finally{
                setIsChecking(false);
            }
        }
    }["UserDashboardPage.useCallback[handleCheckOut]"], [
        currentUser,
        todayAttendance,
        pushMessage,
        fetchTodayAttendance,
        fetchAttendanceHistory,
        showHistory
    ]);
    const toggleHistory = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "UserDashboardPage.useCallback[toggleHistory]": ()=>{
            setShowHistory({
                "UserDashboardPage.useCallback[toggleHistory]": (prev)=>!prev
            }["UserDashboardPage.useCallback[toggleHistory]"]);
        }
    }["UserDashboardPage.useCallback[toggleHistory]"], []);
    const todayStatus = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "UserDashboardPage.useMemo[todayStatus]": ()=>[
                {
                    label: 'Check-in',
                    value: todayAttendance?.checkInTime ? formatDateTime(todayAttendance.checkInTime) : '--/--'
                },
                {
                    label: 'Check-out',
                    value: todayAttendance?.checkOutTime ? formatDateTime(todayAttendance.checkOutTime) : '--/--'
                },
                {
                    label: 'Tổng giờ',
                    value: formatTotalHours(todayAttendance?.totalHours)
                },
                {
                    label: 'Ngày làm',
                    value: formattedDate
                }
            ]
    }["UserDashboardPage.useMemo[todayStatus]"], [
        todayAttendance,
        formattedDate
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('div', {
        className: 'ritzy-dashboard'
    }, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('div', {
        className: 'ritzy-shell'
    }, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('header', {
        className: 'ritzy-top-bar'
    }, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('div', null, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('p', {
        className: 'ritzy-brand'
    }, 'Chấm công Bình Boong'), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('p', {
        className: 'ritzy-subtitle'
    }, 'Một ngày làm việc vui vẻ hoặc không'), currentUser ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('p', {
        className: 'ritzy-greeting'
    }, 'Xin chào, ', currentUser.fullName ?? currentUser.username) : null), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('div', {
        style: headerButtonStyle
    }, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('span', {
        className: 'ritzy-calendar-chip'
    }, formattedDate), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('button', {
        className: 'ritzy-btn',
        onClick: handleLogout
    }, 'Đăng xuất'))), message ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('div', {
        className: `ritzy-alert ${message.type}`
    }, message.text) : null, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('div', {
        className: 'ritzy-content-grid'
    }, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('section', {
        className: 'ritzy-hero'
    }, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('p', {
        className: 'ritzy-hero-kicker'
    }, 'Thời gian hệ thống:'), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('div', {
        className: 'ritzy-hero-clock'
    }, formattedTime), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('p', {
        className: 'ritzy-hero-caption'
    }, 'Đồng hồ chấm công'), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('div', {
        className: 'ritzy-hero-meta'
    }, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('span', null, formattedDate), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('span', null, todayAttendance ? 'Sẵn sàng hoàn tất ngày làm việc' : 'Đã đến giờ bắt đầu ngày mới'), todayAttendance?.checkInTime ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('span', null, `Đã check-in: ${formatDateTime(todayAttendance.checkInTime)}`) : null)), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('section', {
        className: 'ritzy-panel'
    }, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('div', {
        className: 'ritzy-panel-header'
    }, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('div', null, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('p', {
        className: 'ritzy-overline'
    }, 'Hôm nay'), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('h2', {
        className: 'ritzy-panel-title'
    }, 'Trạng thái làm việc'))), isTodayLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('p', {
        className: 'ritzy-placeholder'
    }, 'Đang tải thông tin hôm nay...') : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('div', {
        className: 'user-status-grid'
    }, todayStatus.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('div', {
            key: item.label,
            className: 'user-status-row'
        }, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('span', null, item.label), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('strong', null, item.value)))))), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('div', {
        className: 'ritzy-grid'
    }, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('article', {
        className: `ritzy-action-card ${todayAttendance ? 'disabled' : ''}`,
        'aria-disabled': Boolean(todayAttendance)
    }, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('h3', null, 'Chấm công vào'), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('p', null, 'Ghi nhận thời điểm bắt đầu làm việc trong ngày.'), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('button', {
        className: 'ritzy-btn block',
        onClick: handleCheckIn,
        disabled: Boolean(todayAttendance) || isChecking
    }, isChecking ? 'Đang xử lý...' : 'Chấm công vào')), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('article', {
        className: `ritzy-action-card ${!todayAttendance || todayAttendance.checkOutTime ? 'disabled' : ''}`,
        'aria-disabled': !todayAttendance || Boolean(todayAttendance?.checkOutTime)
    }, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('h3', null, 'Chấm công ra'), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('p', null, 'Hoàn tất phiên làm việc và tính tổng giờ.'), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('button', {
        className: 'ritzy-btn block',
        onClick: handleCheckOut,
        disabled: !todayAttendance || Boolean(todayAttendance.checkOutTime) || isChecking
    }, isChecking ? 'Đang xử lý...' : 'Chấm công ra')), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('article', {
        className: 'ritzy-action-card'
    }, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('h3', null, 'Lịch sử chấm công'), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('p', null, 'Xem 10 bản ghi gần nhất của bạn.'), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('button', {
        className: 'ritzy-btn ghost block',
        onClick: toggleHistory
    }, showHistory ? 'Thu gọn lịch sử' : 'Xem lịch sử'))), showHistory ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('section', {
        className: 'ritzy-history'
    }, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('header', null, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('div', null, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('p', {
        className: 'ritzy-overline'
    }, 'Lịch sử'), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('h2', {
        className: 'ritzy-panel-title'
    }, 'Nhật ký chấm công')), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('span', {
        className: 'ritzy-calendar-chip'
    }, `${attendanceHistory.length} bản ghi`)), isHistoryLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('p', {
        className: 'ritzy-placeholder'
    }, 'Đang tải lịch sử...') : attendanceHistory.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('p', {
        className: 'ritzy-placeholder'
    }, 'Bạn chưa có lịch sử chấm công.') : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('div', {
        className: 'ritzy-table-wrapper'
    }, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('table', {
        className: 'ritzy-history-table'
    }, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('thead', null, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('tr', null, /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('th', null, 'Ngày'), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('th', null, 'Check-in'), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('th', null, 'Check-out'), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('th', null, 'Tổng giờ'), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('th', null, 'Trạng thái'))), /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])('tbody', null, attendanceHistory.map((att)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createElement"])(HistoryRow, {
            key: att.id,
            attendance: att
        })))))) : null));
};
_s(UserDashboardPage, "vdWuy5WR39is3ZIFWR8RlMSqPZI=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$hooks$2f$useRequireAuth$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRequireAuth"]
    ];
});
_c1 = UserDashboardPage;
const __TURBOPACK__default__export__ = UserDashboardPage;
var _c, _c1;
__turbopack_context__.k.register(_c, "HistoryRow");
__turbopack_context__.k.register(_c1, "UserDashboardPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/node_modules/next/navigation.js [app-client] (ecmascript)", ((__turbopack_context__, module, exports) => {

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/client/components/navigation.js [app-client] (ecmascript)");
}),
]);

//# sourceMappingURL=_e162686f._.js.map