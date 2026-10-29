# 发布与部署说明

> **状态：已发布**
> GitHub 仓库：<https://github.com/amytrd/mall-test-portfolio>  
> 在线作品集：<https://amytrd.github.io/mall-test-portfolio/>

这份作品集是**纯静态 + Jekyll**：`docs/index.html` 是主页，`docs/reports/*.md` 由 GitHub Pages 内置的 Jekyll 渲染成 HTML。

## 一、当前 Pages 配置

| 项 | 值 |
|---|---|
| Source | Deploy from a branch |
| Branch | `main` |
| Folder | `/docs` |
| 访问地址 | `https://amytrd.github.io/mall-test-portfolio/` |

## 二、如果迁移到新账号 / 新仓库

```powershell
cd test-portfolio
git remote set-url origin https://github.com/<new-owner>/<new-repo>.git
git push -u origin main
```

然后：

1. 打开新仓库 **Settings → Pages**；
2. **Source** 选择 **Deploy from a branch**；
3. **Branch** 选择 `main`，目录选择 **`/docs`**；
4. **Save**，等待 1–2 分钟；
5. 访问 `https://<new-owner>.github.io/<new-repo>/`。

如果仓库名不是 `mall-test-portfolio`，需要把 `README.md`、`docs/index.html`、`.github/` 中的 `amytrd/mall-test-portfolio` 同步替换。

## 三、检查清单

- [x] 主页能打开，9 份报告链接都能跳转
- [x] 两张性能图表能悬停、能展开数据表
- [x] `docs/evidence/pytest-report.html` 能打开
- [x] `docs/evidence/jmeter-login-200/index.html` 能打开
- [x] Postman 集合、JMeter 脚本包、功能测试 CSV 能下载
- [x] 仓库里没有 `.venv/`、`__pycache__/`、`*.log`、227 MB 运行日志
- [x] 所有 JWT / Token 已脱敏，占位符已替换为 `amytrd`

## 四、可选：自定义域名

1. 在仓库根目录添加 `CNAME` 文件，内容为你的域名（如 `qa.example.com`）；
2. 在域名服务商添加 CNAME 记录指向 `amytrd.github.io`；
3. 在 **Settings → Pages → Custom domain** 填入域名并开启 HTTPS。

## 五、说明

- GitHub Pages 对项目站点默认使用 `https://<user>.github.io/<repo>/`，本仓库所有链接均为相对路径，无需改 `baseurl`。
- `docs/_config.yml` 已配置 `kramdown + GFM`，支持 Markdown 表格与代码高亮。
- 如果使用 GitHub Actions 的 "Static HTML" 部署方式，Jekyll 不会渲染 Markdown 报告；请使用 **Deploy from a branch / docs** 方式。
- 联系方式使用仓库 Issues 页，不在公开页面暴露个人邮箱。
