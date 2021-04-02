/*
* NOTICE: Copyright 2021 Talend SA, Talend, Inc., and affiliates. All Rights Reserved. Customer’s use of the software contained herein is subject to the terms and conditions of the Agreement between Customer and Talend.
 */

const isNullOrUndefined = (item) => {
  return item == null;
};

const TESTER_PAID_ID = 'ndhpdjlmagefginpimmegdninnnkodgo';
const TESTER_FREE_ID = 'aejoelaoggembcahagimdiliamlcdmfm';
const TESTER_FREE_INSTALL_URL = 'https://chrome.google.com/webstore/detail/aejoelaoggembcahagimdiliamlcdmfm';

const apiContextMeta = document.querySelector('[name=try-in-tester-api-context]');
let API_CONTEXT;
if(!isNullOrUndefined(apiContextMeta)) {
  API_CONTEXT = JSON.parse(apiContextMeta.getAttribute('content')) ;
}

const tryInTesterApiButton = document.querySelector('.js-api-try-in-tester');
if(!isNullOrUndefined(tryInTesterApiButton)) {
  tryInTesterApiButton.addEventListener('click', () => {
    tryApiInTester();
  });
}

const tryInTesterOperationButtons = Array.from(document.querySelectorAll('.js-operation-try-in-tester'));
tryInTesterOperationButtons.forEach(tryInTesterOperationButton => {
  tryInTesterOperationButton.addEventListener('click', () => {
    tryOperationInTester(tryInTesterOperationButton.getAttribute('data-operation-id'));
  });
});

const tryOperationInTester = (operationId = '') => {
  const testerId = getInstalledTesterOrOpenChromeStoreIfNeeded();
  if(testerId) {
    fetchEntityTreeNode()
      .then(entityTreeNode => {
        if(entityTreeNode) {
          const payload = buildPayloadForOperation(entityTreeNode.children, operationId);
          if(payload) {
            postTryInTesterMessage(
              testerId,
              'openRequest',
              payload
            );
          }
        }
      });
  }
};

const fetchEntityTreeNode = () => {
  return fetch(API_CONTEXT.etnResource6Url)
    .then(response => {
      if(response.ok) {
        return Promise.resolve(response.json());
      } else {
        return Promise.reject('Impossible to fetch the entity tree node.');
      }
    })
    .then(data => {
      let entityTreeNode = data.entities[ 0 ];
      if(isNullOrUndefined(entityTreeNode)) {
        return Promise.reject('apitesterformat6.json is malformed');
      }
      return Promise.resolve(entityTreeNode);
    });
};

const retrieveEntityFromOperationId = (arrayEntityObjects, operationId) => {
  let entityObject;
  arrayEntityObjects.some(function findOperation(nestedEntity) {
    if (nestedEntity.entity.id === operationId) {
      entityObject = nestedEntity;
      return true;
    }
    return nestedEntity.children?.some(findOperation);
  });

  return entityObject;
};

const buildPayloadForOperation = (arrayEntityObjects, operationId) => {
  const entityObject = retrieveEntityFromOperationId(arrayEntityObjects, operationId);
  if(isNullOrUndefined(entityObject) || isNullOrUndefined(entityObject.entity)) {
    console.error('Impossible to retrieve the entity tree node related to the operation ID');
    return null;
  } else {
    return entityObject.entity;
  }
};

const tryApiInTester = () => {
  const testerId = getInstalledTesterOrOpenChromeStoreIfNeeded();
  if(testerId) {
    fetchEntityTreeNode()
      .then(entityTreeNode => {
        if (entityTreeNode) {
          const payload = buildPayloadForApi(entityTreeNode);
          postTryInTesterMessage(
            testerId,
            'openApi',
            payload
          );
        }
      });
  }
};

const buildPayloadForApi = (entityTreeNodeUpdated) => {
  return {
    apiMetadata: {},
    entityTreeNode: entityTreeNodeUpdated,
    environments: []
  };
};

const getInstalledTesterOrOpenChromeStoreIfNeeded = () => {
  if (isChromeBrowser()) {
    const testerId = getTesterIdInstalled();
    if (testerId) {
      return testerId;
    }
  }
  window.open(TESTER_FREE_INSTALL_URL, '_blank');
  return null;
};

const isChromeBrowser = () => {
  // Source https://stackoverflow.com/a/13348618
  const isChromium = window.chrome;
  const winNav = window.navigator;
  const vendorName = winNav.vendor;
  const isOpera = typeof window.opr !== 'undefined';
  const isIEedge = winNav.userAgent.indexOf('Edge') > -1;
  const isIOSChrome = winNav.userAgent.match('CriOS');

  if (isIOSChrome) {
    return true;
  } else if (isChromium !== null && typeof isChromium !== 'undefined' && vendorName === 'Google Inc.' && isOpera === false && isIEedge === false) {
    return true;
  } else {
    return false;
  }
};

const getTesterIdInstalled = () => {
  if (isTesterInstalled(TESTER_PAID_ID)) {
    return TESTER_PAID_ID;
  }
  if (isTesterInstalled(TESTER_FREE_ID)) {
    return TESTER_FREE_ID;
  }
  return null;
};

const isTesterInstalled = (testerId) => {
  const testerInstall = getTesterInstall(testerId);
  return !isNullOrUndefined(testerInstall);
};

const getTesterInstall = (testerId) => {
  const testerConfigurations = Array.prototype.slice.call(document.querySelectorAll('#dhcIndicator'))
    .map(node => node.innerText)
    .map(innerText => JSON.parse(innerText));

  return testerConfigurations
    .find(testerInstall => testerInstall.extensionId === testerId);
};

/*
In the following function, keys of JSON objects are set in lowercase.
Indeed, they are retrieved from a JSON object in the DOM (meta element) and HUGO transforms keys in lowercase.
 */
const postTryInTesterMessage = (testerId, type, payload) => {

  const defaultIsDevMode = false;
  const defaultQueryStringParameter = '';

  function getTryInTesterConfig () {
    const metaItemTryInTesterConfig = document.querySelector('[name=try-in-tester-configuration]');
    if(isNullOrUndefined(metaItemTryInTesterConfig)) {
      return {
        isdevmode: defaultIsDevMode,
        querystringparameter: defaultQueryStringParameter,
        testerextensionid: testerId
      };
    } else {
      const configTesterParams = JSON.parse(metaItemTryInTesterConfig.getAttribute('content'));
      return updateTryInTesterConfig(configTesterParams);
    }
  }

  function updateTryInTesterConfig({isdevmode=defaultIsDevMode, querystringparameter=defaultQueryStringParameter, testerextensionid=testerId}) {
    return {isdevmode, querystringparameter, testerextensionid}
  }

  const TRY_IN_TESTER_CONFIG = getTryInTesterConfig();
  const message = {
    isDevMode: TRY_IN_TESTER_CONFIG.isdevmode,
    payload: payload,
    payloadType: payload ? 'apiTester' : 'none',
    queryString: TRY_IN_TESTER_CONFIG.querystringparameter,
    source: 'API Portal',
    target: TRY_IN_TESTER_CONFIG.testerextensionid,
    type: type,
    shouldReplaceOriginTab: false,
  };
  window.postMessage(message, window.location.origin);
};
