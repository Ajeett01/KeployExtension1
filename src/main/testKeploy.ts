import * as vscode from 'vscode';
import { readFileSync, appendFile } from 'fs';

export async function displayTestCases(logfilePath: string, webview: any, isHomePage: boolean, isCompleteSummary: boolean): Promise<void> {
    console.log('Displaying test cases');
    let logData;
    try {
        try {
            logData = readFileSync(logfilePath, 'utf8');
        }
        catch (error) {
            appendFile(logfilePath, "", function (err) {
                if (err) { console.log("err here " + err); }
            });
            logData = readFileSync(logfilePath, 'utf8');
        }
        const logLines = logData.split('\n');
        const startIndex = logLines.findIndex(line => line.includes('COMPLETE TESTRUN SUMMARY.'));
        if (startIndex === -1) {
            console.log('Start index not found');
            webview.postMessage({
                type: 'testResults',
                value: 'Test Failed',
                textSummary: "Error Replaying Test Cases. Please try again.",
                error: true,
                isHomePage: isHomePage,
                isCompleteSummary: isCompleteSummary
            });
            return;
        }
        const endIndex = logLines.findIndex((line, index) => index > startIndex && line.includes('<=========================================>'));
        if (endIndex === -1) {
            console.log('End index not found');
            webview.postMessage({
                type: 'testResults',
                value: 'Test Failed',
                textSummary: "Error Replaying Test Cases. Please try again.",
                error: true,
                isHomePage: isHomePage,
                isCompleteSummary: isCompleteSummary
            });
            return;
        }
        const testSummary = logLines.slice(startIndex, endIndex + 1).join('\n');
        if (testSummary.length === 0) {
            webview.postMessage({
                type: 'testResults',
                value: 'Test Failed',
                textSummary: "Error Replaying Test Cases. Please try again.",
                error: true,
                isHomePage: isHomePage,
                isCompleteSummary: isCompleteSummary
            });
            return;
        }
        const ansiRegex = /[\u001B\u009B][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
        const cleanSummary = testSummary.replace(ansiRegex, '');
        const testSummaryList = cleanSummary.split('\n');
        testSummaryList.pop();
        testSummaryList.shift();
        if (isCompleteSummary) {
            testSummaryList.splice(0, 7);
            testSummaryList.forEach((line, index) => {
                webview.postMessage({
                    type: 'testResults',
                    value: 'Test Summary Generated',
                    textSummary: line,
                    isHomePage: false,
                    isCompleteSummary: isCompleteSummary
                });
            });
        }
        else {
            testSummaryList.forEach((line, index) => {
                if (index > 2) {
                    return;
                }
                webview.postMessage({
                    type: 'testResults',
                    value: 'Test Summary Generated',
                    textSummary: line,
                    isHomePage: isHomePage,
                    isCompleteSummary: isCompleteSummary
                });
            });
        }
    }
    catch (error) {
        console.log(error);
        vscode.window.showErrorMessage('Error occurred Keploy Test: ' + error);
        throw error;
    }
}


export async function startTesting(command: string, folderPath: string,generatedTestCommand:string, wslscriptPath: string, wsllogfilePath: string, scriptPath: string, logfilePath: string, webview: any): Promise<void> {
    try {
        return new Promise<void>((resolve, reject) => {
            try {
                let bashPath: string;
                if (process.platform === 'win32') {
                    bashPath = 'wsl.exe';
                } else {
                    bashPath = '/bin/bash';
                }
                generatedTestCommand = generatedTestCommand.replace('keploy', '');
                const terminal = vscode.window.createTerminal({
                    name: 'Keploy Terminal',
                    shellPath: bashPath,
                });
                terminal.show();
                if (process.platform === 'win32') {
                    const testCmd = `${wslscriptPath}  "${wsllogfilePath}" "${folderPath}" "${generatedTestCommand}" ;exit 0 `;
                    terminal.sendText(testCmd);
                }
                else {
                    const testCmd = `sudo ${scriptPath} "${logfilePath}" "${folderPath}" "${generatedTestCommand}" ;exit 0 `;
                    terminal.sendText(testCmd);
                }
                const disposable = vscode.window.onDidCloseTerminal(eventTerminal => {
                    console.log('Terminal closed');
                    if (eventTerminal === terminal) {
                        disposable.dispose();
                        displayTestCases(logfilePath, webview, false, false);
                        resolve();
                    }
                });
            } catch (error) {
                console.log("error is " + error);
                vscode.window.showErrorMessage('Error occurred Keploy Test: ' + error);
                reject(error);
            }
        });
    }
    catch (error) {
        console.log(error);
        vscode.window.showErrorMessage('Error occurred Keploy Test: ' + error);
        throw error;
    }
}

export async function stopTesting(): Promise<void> {
    try {
        vscode.window.activeTerminal?.dispose();
        return;
    }
    catch (error) {
        console.log(error);
        throw error;
    }
}
