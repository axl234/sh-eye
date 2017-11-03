const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const iPhone = devices['iPhone 6'];
let {timeout, moment} = require('./tools.js');
let rq = require('request-promise');
var child_process = require('child_process');

function monitor() {
    puppeteer.launch().then(async browser => {
        console.log('puppeteer launch success...');

        let page = await browser.newPage();
        await page.emulate(iPhone);
        let date = moment("Y-M-DTh:m:s");
        let time = new Date().getTime();
        let site = 'http://webapp.icloudcity.cn:5000';
        let options = {
            method: 'POST',
            uri: 'http://127.0.0.1:8360/monitorerr',
            body: {
                img: `${time}.png`,
                state: 'error',
                time: time
            },
            json: true
        };

        try {
            console.log('goto the site');
            await page.goto(site);
            await timeout(3000);
            let info = await page.evaluate(() => {
                let post = [...document.querySelectorAll('.gift_list')];
                return post.map((a) => a.innerText);
            });
            console.log(JSON.stringify(info));

            // 如果渲染不正常 || 无数据，则请求接口记录，并保存图片
            if (info.length == 0) {
              console.log('there may be an error on the site!!!');

              options.body.info = '商品获取为空'
              await rq(options);

              child_process.spawnSync('rm', ['-rf', './www/static/img/err']);
              child_process.spawnSync('mkdir', ['./www/static/img/err']);
              await page.screenshot({path: `./www/static/img/err/${time}.png`, type: 'png'});

              console.log('puppeteer end...');
              browser.close();
              return;
            }

            for (let i = 0; i < info.length; i++) {
                if (!info[i]) {
                    console.log('there may be an error on the site!!!');
                    options.body.info = `第${i+1}条记录可能存在问题`
                    await rq(options);
                    child_process.spawnSync('rm', ['-rf', './www/static/img/err']);
                    child_process.spawnSync('mkdir', ['./www/static/img/err']);
                    await page.screenshot({path: `./www/static/img/err/${time}.png`, type: 'png'});
                    console.log('puppeteer end...');
                    browser.close();
                    return;
                }
            }

            // 如果正常则发送请求，截图并删除之前的图片，结束任务
            options.body.state = 'success';
            options.uri = 'http://127.0.0.1:8360/monitor';
            await rq(options);
            child_process.spawnSync('rm', ['-rf', './www/static/img/success']);
            child_process.spawnSync('mkdir', ['./www/static/img/success']);
            await page.screenshot({path: `./www/static/img/success/${time}.png`, type: 'png'});

            console.log('the site is well');
        } catch (e) {
          console.log('catch error');
          options.body.img = '无图片，上层异常，可能无法进入网站';
          await rq(options);
          console.log('there may be an error on the site!!!');
        } finally {
          browser.close();
          console.log('puppeteer end...');
          return;
        }
    });
}

monitor();
// 每5分钟请求
setInterval(monitor, 1000 * 60 * 5);
