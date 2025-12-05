# Hướng dẫn xóa các file nhạy cảm khỏi GitHub

## Các file đã được commit nhầm:
1. `.env` - File chứa biến môi trường nhạy cảm ⚠️ QUAN TRỌNG
2. `.next/` - Thư mục build của Next.js
3. Các file build artifacts khác

## Cách sửa:

### Bước 1: Xóa các file khỏi git tracking (nhưng giữ lại trên máy)

```bash
cd frontend

# Xóa .env khỏi git
git rm --cached .env

# Xóa .next/ khỏi git
git rm -r --cached .next/

# Xóa tsconfig.tsbuildinfo nếu có
git rm --cached tsconfig.tsbuildinfo 2>/dev/null || true

# Xóa next-env.d.ts nếu có
git rm --cached next-env.d.ts 2>/dev/null || true
```

### Bước 2: Commit thay đổi

```bash
git add .gitignore
git commit -m "Remove sensitive files and build artifacts from git tracking"
```

### Bước 3: Push lên GitHub

```bash
git push origin main
# hoặc
git push origin master
```

## ⚠️ QUAN TRỌNG: Nếu .env chứa thông tin nhạy cảm

Nếu file `.env` chứa API keys, passwords, hoặc thông tin nhạy cảm khác, bạn CẦN:

1. **Đổi tất cả các keys/passwords** đã commit lên GitHub
2. **Xóa file khỏi git history** (xem phần dưới)

### Xóa file khỏi git history hoàn toàn:

**Cách 1: Sử dụng git filter-branch (chậm nhưng có sẵn)**

```bash
# Xóa .env khỏi toàn bộ lịch sử
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Xóa .next/ khỏi toàn bộ lịch sử
git filter-branch --force --index-filter \
  "git rm -r --cached --ignore-unmatch .next" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (CẨN THẬN!)
git push origin --force --all
git push origin --force --tags
```

**Cách 2: Sử dụng BFG Repo-Cleaner (nhanh hơn, khuyến nghị)**

1. Tải BFG: https://rtyley.github.io/bfg-repo-cleaner/
2. Chạy lệnh:
```bash
java -jar bfg.jar --delete-files .env
java -jar bfg.jar --delete-folders .next
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push origin --force --all
```

## Lưu ý:

- Sau khi force push, các thành viên khác trong team cần clone lại repo
- Nếu repo là public, các file đã commit vẫn có thể được tìm thấy trong cache của GitHub
- Luôn kiểm tra `.env` trước khi commit

