const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/fonts', express.static(path.join(__dirname, 'fonts/web')));
app.use('/img', express.static(path.join(__dirname, 'img')));

const API_URL = 'https://api.siliconflow.cn/v1/images/generations';
const API_TOKEN = process.env.API_TOKEN;

// 验证 token 是否存在
if (!API_TOKEN) {
    console.error('错误: API_TOKEN 未设置');
    process.exit(1);
}

app.post('/generate-image', async (req, res) => {
    try {
        const {
            prompt,
            negative_prompt,
            model,
            batch_size,
            seed,
            num_inference_steps,
            guidance_scale,
            prompt_enhancement,
            image_size
        } = req.body;

        // 构建请求体
        const requestBody = {
            model: model || "Pro/black-forest-labs/FLUX.1-schnell",
            prompt: prompt || "test image",
            negative_prompt: negative_prompt || "",
            image_size: image_size || "512x512",
            batch_size: parseInt(batch_size) || 1,
            seed: seed ? parseInt(seed) : Math.floor(Math.random() * 1000000000),
            num_inference_steps: parseInt(num_inference_steps) || 25,
            guidance_scale: parseFloat(guidance_scale) || 7.5,
            prompt_enhancement: prompt_enhancement || false
        };

        console.log('发送请求:', {
            ...requestBody,
            prompt: requestBody.prompt.substring(0, 50) + (requestBody.prompt.length > 50 ? '...' : '')
        });

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const responseText = await response.text();
        console.log('API响应:', responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error('响应解析失败:', e);
            throw new Error('无效的响应格式');
        }

        if (!response.ok) {
            throw new Error(`API错误: ${response.status} - ${JSON.stringify(data)}`);
        }

        // 确保返回正确的图片URL
        if (data.images && data.images.length > 0) {
            res.json({
                images: data.images.map(img => img.url),
                seed: data.seed,
                timings: data.timings
            });
        } else {
            throw new Error('未找到生成的图片');
        }

    } catch (error) {
        console.error('错误:', error);
        res.status(500).json({
            error: '生成失败',
            message: error.message,
            details: error.response?.data || error.response?.text
        });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
    console.log('Token 检查:', {
        exists: !!API_TOKEN,
        length: API_TOKEN?.length,
        prefix: API_TOKEN?.substring(0, 2)
    });
}); 