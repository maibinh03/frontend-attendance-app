#!/bin/bash

# Script để xóa các file nhạy cảm khỏi git tracking

echo "🔍 Đang kiểm tra các file cần xóa..."

# Xóa .env khỏi git tracking
if git ls-files --error-unmatch .env >/dev/null 2>&1; then
    echo "❌ Tìm thấy .env trong git - đang xóa..."
    git rm --cached .env
    echo "✅ Đã xóa .env khỏi git tracking"
else
    echo "✅ .env không có trong git"
fi

# Xóa .next/ khỏi git tracking
if git ls-files | grep -q "^\.next/"; then
    echo "❌ Tìm thấy .next/ trong git - đang xóa..."
    git rm -r --cached .next/
    echo "✅ Đã xóa .next/ khỏi git tracking"
else
    echo "✅ .next/ không có trong git"
fi

# Xóa tsconfig.tsbuildinfo
if git ls-files --error-unmatch tsconfig.tsbuildinfo >/dev/null 2>&1; then
    echo "❌ Tìm thấy tsconfig.tsbuildinfo trong git - đang xóa..."
    git rm --cached tsconfig.tsbuildinfo
    echo "✅ Đã xóa tsconfig.tsbuildinfo khỏi git tracking"
fi

# Xóa next-env.d.ts
if git ls-files --error-unmatch next-env.d.ts >/dev/null 2>&1; then
    echo "❌ Tìm thấy next-env.d.ts trong git - đang xóa..."
    git rm --cached next-env.d.ts
    echo "✅ Đã xóa next-env.d.ts khỏi git tracking"
fi

echo ""
echo "📝 Đang thêm .gitignore vào staging..."
git add .gitignore

echo ""
echo "✅ Hoàn tất! Các file đã được xóa khỏi git tracking."
echo ""
echo "⚠️  QUAN TRỌNG:"
echo "1. Kiểm tra các thay đổi: git status"
echo "2. Commit: git commit -m 'Remove sensitive files and build artifacts'"
echo "3. Push: git push origin main"
echo ""
echo "🔒 Nếu .env chứa thông tin nhạy cảm, bạn CẦN:"
echo "   - Đổi tất cả API keys/passwords đã commit"
echo "   - Xem FIX_GIT.md để xóa khỏi git history"

