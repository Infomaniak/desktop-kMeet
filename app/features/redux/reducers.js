// @flow

import { combineReducers } from 'redux';

import { reducer as routerReducer } from '../router';
import { reducer as settingsReducer } from '../settings';

export default combineReducers({
    router: routerReducer,
    settings: settingsReducer
});
