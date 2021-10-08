import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as VscodeSpotyArmy from '../lib/vscode-spoty-army-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new VscodeSpotyArmy.VscodeSpotyArmyStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
