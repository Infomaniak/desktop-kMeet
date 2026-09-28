import './styles/reset.css';

import React, { Component, Suspense } from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import { App } from './features/app';
import { persistor, store } from './features/redux';
import Spinner from './features/shared/components/Spinner';

import './i18n';

class Root extends Component {
    render() {
        return (
            <Provider store = { store }>
                <PersistGate
                    loading = { null }
                    persistor = { persistor }>
                    <Suspense fallback = { <Spinner /> } >
                        <App />
                    </Suspense>
                </PersistGate>
            </Provider>
        );
    }
}

render(
    <Root />,
    document.getElementById('app')
);
