// オーディオファイルの読み込み
const bgm = new Audio('audio/field.mp3');
bgm.loop = true; // BGMをループ再生する設定

const seikaiSound = new Audio('audio/seikai2.mp3');   // 成功時の効果音
const fuseikaiSound = new Audio('audio/fuseikai2.mp3'); // 失敗時の効果音
const levelupSound = new Audio('audio/levelup.mp3');   // 次のお客さんへの切り替え時などに鳴らす
const maouSound = new Audio('audio/maou.mp3');       // ゲームオーバー時の演出音
const sentouSound = new Audio('audio/sentou.mp3');   // （現状では未使用。将来の戦闘演出用）

// ゲーム状態管理
let gameState = {
    money: 500,
    trust: 100,
    day: 1,
    selectedItem: null,
    currentCustomer: null
};

// 商品データ
let inventory = {
    watch: { name: '腕時計', icon: '⌚', isReal: false, price: 50, realPrice: 150 },
    bag:   { name: 'バッグ',   icon: '👜', isReal: false, price: 80, realPrice: 200 },
    shoes: { name: '靴',       icon: '👟', isReal: false, price: 60, realPrice: 180 }
};

// お客さんの種類（目利きレベル付き）
let customerTypes = [
    { request: 'watch', message: '腕時計が欲しいです', baseDetectChance: 30 },
    { request: 'bag',   message: 'バッグが欲しいです',   baseDetectChance: 40 },
    { request: 'shoes', message: '靴が欲しいです',       baseDetectChance: 35 }
];

// DOM要素の取得
const moneyDisplay   = document.getElementById('money');
const trustDisplay   = document.getElementById('trust');
const dayDisplay     = document.getElementById('day');
const customerRequestDisplay = document.getElementById('customer-request');
const itemsGrid      = document.querySelector('.items-grid');
const sellBtn        = document.getElementById('sell-btn');
const lieBtn         = document.getElementById('lie-btn');
const upgradeBtn     = document.getElementById('upgrade-btn');
const resultArea     = document.getElementById('result-area');
const resultTitle    = document.getElementById('result-title');
const resultMessage  = document.getElementById('result-message');
const nextBtn        = document.getElementById('next-btn');
const gameoverArea   = document.getElementById('gameover-area');
const finalScoreDisplay    = document.getElementById('final-score');
const finalMessageDisplay  = document.getElementById('final-message');
const restartBtn     = document.getElementById('restart-btn');
const helpBtn        = document.getElementById('help-btn');
const helpModal      = document.getElementById('help-modal');
const closeModalBtn  = document.getElementById('close-modal');

// UI更新関数
function updateUI() {
    moneyDisplay.textContent = gameState.money;
    trustDisplay.textContent = gameState.trust;
    dayDisplay.textContent = gameState.day;

    // 商品の品質表示を更新
    for (const itemId in inventory) {
        const itemQualityElement = document.getElementById(`${itemId}-quality`);
        if (itemQualityElement) {
            itemQualityElement.textContent = inventory[itemId].isReal ? '本物' : '偽物';
            itemQualityElement.classList.toggle('real', inventory[itemId].isReal);
            itemQualityElement.classList.toggle('fake', !inventory[itemId].isReal);
        }
    }

    // アクションボタンの状態を更新
    sellBtn.disabled    = !gameState.selectedItem;
    lieBtn.disabled     = !gameState.selectedItem;
    upgradeBtn.disabled = !gameState.selectedItem 
                           || inventory[gameState.selectedItem]?.isReal 
                           || gameState.money < 100;
}

// お客さんを生成
function generateCustomer() {
    const randomIndex = Math.floor(Math.random() * customerTypes.length);
    const customer = { ...customerTypes[randomIndex] };
    customer.detectChance = customer.baseDetectChance + (gameState.day - 1) * 5;
    if (customer.detectChance > 90) customer.detectChance = 90;
    gameState.currentCustomer = customer;

    // 表示更新
    customerRequestDisplay.textContent = `「${customer.message}」`;

    // ⭐ ランダム画像設定
    const imgIndex = Math.floor(Math.random() * 10) + 1; // 1〜10
    const customerImg = document.getElementById('customer-img');
    customerImg.src = `images/customer_${imgIndex}.png`;

    selectItem(null);
}

// アイテム選択
function selectItem(itemId) {
    // 以前に選択されたアイテムのselectedクラスを削除
    if (gameState.selectedItem) {
        document.querySelector(`.item[data-item="${gameState.selectedItem}"]`).classList.remove('selected');
    }

    gameState.selectedItem = itemId;

    // 新しく選択されたアイテムにselectedクラスを追加
    if (itemId) {
        document.querySelector(`.item[data-item="${itemId}"]`).classList.add('selected');
    }
    updateUI();
}

// 結果表示モーダル
function showResult(title, message) {
    resultTitle.textContent   = title;
    resultMessage.textContent = message;
    resultArea.style.display  = 'flex';
    if (navigator.vibrate) {
        navigator.vibrate(200); // 短い振動
    }
}

// ゲームオーバー表示モーダル
function showGameOver() {
    finalScoreDisplay.textContent = `最終スコア: ${gameState.money}円`;
    if (gameState.money >= 1000) {
        finalMessageDisplay.textContent = "すごい！あなたは一流の店主です！";
    } else if (gameState.money >= 500) {
        finalMessageDisplay.textContent = "よく頑張りました！";
    } else {
        finalMessageDisplay.textContent = "残念！次はもっと頑張ろう！";
    }
    gameoverArea.style.display = 'flex';

    // ゲームオーバー効果音を再生
    maouSound.currentTime = 0;
    maouSound.play();

    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]); // 2回の短い振動
    }
}

// ゲームリセット
function resetGame() {
    // BGMが再生中なら止める
    bgm.pause();
    bgm.currentTime = 0;

    gameState = {
        money: 500,
        trust: 100,
        day: 1,
        selectedItem: null,
        currentCustomer: null
    };
    for (const itemId in inventory) {
        inventory[itemId].isReal = false;
    }
    gameoverArea.style.display = 'none';
    resultArea.style.display   = 'none';
    startGame();
}

// ゲーム開始
function startGame() {
    updateUI();

    // BGMを再生（自動再生制限に引っかかる場合はブラウザコンソールに警告）
    bgm.currentTime = 0;
    const playPromise = bgm.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => {
            console.warn('BGMの自動再生がブロックされました:', error);
        });
    }

    generateCustomer();
}

// イベントリスナー設定
document.addEventListener('DOMContentLoaded', () => {
    // アイテムクリックイベント
    itemsGrid.addEventListener('click', (event) => {
        const itemElement = event.target.closest('.item');
        if (itemElement) {
            const itemId = itemElement.dataset.item;
            selectItem(itemId);
        }
    });

    // そのまま渡すボタン
    sellBtn.addEventListener('click', () => {
        if (!gameState.selectedItem) {
            showResult('エラー', '商品を選んでください！');
            return;
        }
        const item   = inventory[gameState.selectedItem];
        let message  = '';
        let title    = '';

        if (item.isReal) {
            gameState.money += item.realPrice;
            title   = '成功！';
            message = `${item.name}を本物として売りました！ ${item.realPrice}円ゲット！`;
            // 成功効果音を再生
            seikaiSound.currentTime = 0;
            seikaiSound.play();
        } else {
            gameState.money += item.price;
            gameState.trust = Math.max(0, gameState.trust - 10); // 信頼度は0未満にならない
            title   = '残念！';
            message = `${item.name}を偽物として売りました。${item.price}円ゲットしましたが、信頼度が10下がりました...。`;
            // 失敗（偽物）効果音を再生
            fuseikaiSound.currentTime = 0;
            fuseikaiSound.play();
        }
        showResult(title, message);
    });

    // ウソをつくボタン
    lieBtn.addEventListener('click', () => {
        if (!gameState.selectedItem) {
            showResult('エラー', '商品を選んでください！');
            return;
        }
        const item          = inventory[gameState.selectedItem];
        const successChance = 100 - gameState.currentCustomer.detectChance;
        const isSuccess     = Math.random() * 100 < successChance;
        let message         = '';
        let title           = '';

        if (isSuccess) {
            gameState.money += item.realPrice * 2; // ウソが成功すると2倍の値段
            title   = '大成功！';
            message = `ウソがバレずに大成功！${item.name}を本物として売りました！${item.realPrice * 2}円ゲット！`;
            // 成功効果音を再生
            seikaiSound.currentTime = 0;
            seikaiSound.play();
        } else {
            gameState.trust = Math.max(0, gameState.trust - 30); // 信頼度は0未満にならない
            title   = '大失敗...';
            message = `ウソがバレました！お客さんが怒って信頼度が30下がりました...。`;
            // 失敗効果音を再生
            fuseikaiSound.currentTime = 0;
            fuseikaiSound.play();
        }
        showResult(title, message);
    });

    // 本物に交換ボタン
    upgradeBtn.addEventListener('click', () => {
        if (!gameState.selectedItem) {
            showResult('エラー', '商品を選んでください！');
            return;
        }
        if (gameState.money < 100) {
            showResult('お金が足りません！', '本物に交換するには100円必要です。');
            // 失敗効果音を再生
            fuseikaiSound.currentTime = 0;
            fuseikaiSound.play();
            return;
        }
        const item = inventory[gameState.selectedItem];
        if (item.isReal) {
            showResult('情報', 'この商品はすでに本物です。');
            return;
        }

        gameState.money -= 100;
        item.isReal = true;
        gameState.trust = Math.min(100, gameState.trust + 5); // 信頼度は100を超えない
        showResult('交換成功！', `${item.name}を本物に交換しました！信頼度も5アップ！`);
        // 成功効果音を再生
        seikaiSound.currentTime = 0;
        seikaiSound.play();
    });

    // 次のお客さんボタン
    nextBtn.addEventListener('click', () => {
        resultArea.style.display = 'none';

        // 日が進むときの効果音
        levelupSound.currentTime = 0;
        levelupSound.play();

        gameState.day++;
        if (gameState.trust <= 0) {
            showGameOver();
        } else {
            generateCustomer();
            updateUI();
        }
    });

    // もう一度プレイボタン
    restartBtn.addEventListener('click', resetGame);

    // ヘルプボタン
    helpBtn.addEventListener('click', () => {
        helpModal.style.display = 'flex';
    });

    // モーダルを閉じるボタン
    closeModalBtn.addEventListener('click', () => {
        helpModal.style.display = 'none';
    });

    // モーダル外クリックで閉じる
    window.addEventListener('click', (event) => {
        if (event.target === helpModal) {
            helpModal.style.display = 'none';
        }
    });

    startGame();
});
