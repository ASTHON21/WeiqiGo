import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { fileURLToPath } from 'url';

// --- 修复 ESM 下的 __dirname 问题 ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置路径 (确保这些文件夹已手动创建)
const REPO_PATH = path.join(__dirname, 'data/sgf-repo');
const OUTPUT_PATH = path.join(__dirname, 'data/sgf-database.json');

interface SgfEntry {
    hash: string;       // 路径哈希
    nextMove: string;   // SGF坐标 (如 'pd')
    source: string;     // 来源文件名
}

const charToNum = (c: string) => c.charCodeAt(0) - 97;
const numToChar = (n: number) => String.fromCharCode(n + 97);

function getTransformations(coords: {r: number, c: number}[], size: number) {
    const transforms: {r: number, c: number}[][] = Array.from({ length: 8 }, () => []);
    for (const {r, c} of coords) {
        transforms[0].push({ r, c });                         // 原始
        transforms[1].push({ r: c, c: size - 1 - r });       // 旋转90
        transforms[2].push({ r: size - 1 - r, c: size - 1 - c }); // 旋转180
        transforms[3].push({ r: size - 1 - c, c: r });       // 旋转270
        transforms[4].push({ r: size - 1 - r, c });          // 水平镜像
        transforms[5].push({ r, c: size - 1 - c });          // 垂直镜像
        transforms[6].push({ r: c, c: r });                  // 对角线镜像1
        transforms[7].push({ r: size - 1 - c, c: size - 1 - r }); // 对角线镜像2
    }
    return transforms;
}

function parseSgf(content: string, maxMoves: number = 20) {
    const moves: {r: number, c: number, color: string}[] = [];
    const moveRegex = /;([BW])\[([a-z]{2})\]/g;
    let match;
    let count = 0;

    while ((match = moveRegex.exec(content)) && count < maxMoves + 1) {
        moves.push({
            color: match[1],
            r: charToNum(match[2][1]),
            c: charToNum(match[2][0])
        });
        count++;
    }
    const szMatch = content.match(/SZ\[(\d+)\]/);
    const size = szMatch ? parseInt(szMatch[1]) : 19;
    return { moves, size };
}

function sync() {
    console.log("🚀 开始同步 SGF 仓库...");
    const database: Record<string, SgfEntry> = {};
    
    // 如果没有 data/sgf-repo 文件夹，自动创建一个
    if (!fs.existsSync(REPO_PATH)) {
        console.log("📁 正在创建仓库目录...");
        fs.mkdirSync(REPO_PATH, { recursive: true });
        console.log(`💡 请将 .sgf 文件放入此目录: ${REPO_PATH}`);
        return;
    }

    const files = fs.readdirSync(REPO_PATH).filter(f => f.endsWith('.sgf'));

    if (files.length === 0) {
        console.warn("⚠️  仓库中没有发现 .sgf 文件。请先放入文件再运行。");
        return;
    }

    files.forEach(file => {
        const content = fs.readFileSync(path.join(REPO_PATH, file), 'utf-8');
        const { moves, size } = parseSgf(content);

        if (moves.length < 2) return;

        for (let i = 1; i < moves.length; i++) {
            const history = moves.slice(0, i);
            const nextMoveOrigin = moves[i];

            const transformedHistories = getTransformations(history, size);
            const transformedNextMoves = getTransformations([nextMoveOrigin], size);

            transformedHistories.forEach((h, index) => {
                const pathStr = h.map(m => `${m.r},${m.c}`).join('|');
                const hash = crypto.createHash('md5').update(pathStr).digest('hex');
                const nextM = transformedNextMoves[index][0];
                const nextSgf = numToChar(nextM.c) + numToChar(nextM.r);

                if (!database[hash]) {
                    database[hash] = {
                        hash: hash,
                        nextMove: nextSgf,
                        source: file
                    };
                }
            });
        }
    });

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(database, null, 2));
    console.log(`✅ 同步完成！生成了 ${Object.keys(database).length} 条路径。`);
}

sync();
