import ma = require('azure-pipelines-task-lib/mock-answer');
import tmrm = require('azure-pipelines-task-lib/mock-run');
import path = require('path');
import fs = require('fs');

import azureBlobUploadHelper = require('../azure-blob-upload-helper');
import { basicSetup, mockFs, mockAzure } from './UnitTests/TestHelpers';
const libMocker = require('azure-pipelines-task-lib/lib-mocker');
const Stats = require('fs').Stats;
const nock = require('nock');

const taskPath = path.join(__dirname, '..', 'appcenterdistribute.js');
const tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('serverEndpoint', 'MyTestEndpoint');
tmr.setInput('appSlug', 'testuser/testapp');
tmr.setInput('app', './test.zip');
tmr.setInput('buildVersion', "sampleBuildVersion");
tmr.setInput('releaseNotesSelection', 'releaseNotesInput');
tmr.setInput('releaseNotesInput', 'my release notes');
tmr.setInput('symbolsType', 'AndroidJava');

basicSetup();

//begin symbol upload
nock('https://example.test')
    .post('/v0.1/apps/testuser/testapp/symbol_uploads', {
        symbol_type: "AndroidJava"
    })
    .reply(201, {
        symbol_upload_id: 100,
        upload_url: 'https://example.upload.test/symbol_upload',
        expiration_date: 1234567
    });

nock('https://example.test')
    .post('/v0.1/apps/testuser/testapp/releases/1/groups', {
        id: "00000000-0000-0000-0000-000000000000",
        mandatory_update: false
    }).reply(200);
// provide answers for task mock
let a: ma.TaskLibAnswers = <ma.TaskLibAnswers>{
    "checkPath" : {
        "./test.zip": true,
    },
    "findMatch" : {
        "./test.zip": [
            "./test.zip"
        ]
    }
};
tmr.setAnswers(a);

const mockedFs = {...fs, ...mockFs()};

mockedFs.statSync = (s: string) => {
    const stat = new Stats;
    stat.isFile = () => s.endsWith('.zip');
    stat.isDirectory = () => !s.endsWith('.zip');
    stat.size = 100;
    return stat;
}
mockedFs.lstatSync = fs.statSync;

mockAzure();

tmr.registerMock('azure-blob-upload-helper', azureBlobUploadHelper);
tmr.registerMock('fs', mockedFs);
tmr.run();
libMocker.deregisterMock('fs');
libMocker.deregisterMock('azure-blob-upload-helper');