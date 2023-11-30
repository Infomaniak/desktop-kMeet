// @flow

/**
 * AtlasKit components will deflect from appearance if css-reset is not present.
 */
import '@atlaskit/css-reset';

import * as Sentry from '@sentry/electron/renderer';

import Spinner from '@atlaskit/spinner';
import { SpotlightManager } from '@atlaskit/onboarding';

import React, { Component, Suspense } from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { App } from './features/app';
import { persistor, store } from './features/redux';

import './i18n';

/**
 * Component encapsulating App component with redux store using provider.
 */
class Root extends Component<*> {
    /**
     * Initializes a new {@code Root} instance.
     *
     * @inheritdoc
     */
    constructor() {
        super();

        Sentry.init({
            dsn: 'https://9ea9e1754d9b40be10f2f7c28ff07185@sentry-kchat.infomaniak.com/9'
        });
    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @returns {ReactElement}
     */
    render() {
        return (
            <Provider store = { store }>
                <PersistGate
                    loading = { null }
                    persistor = { persistor }>
                    <SpotlightManager>
                        <Suspense fallback = { <Spinner /> } >
                            <App />
                        </Suspense>
                    </SpotlightManager>
                </PersistGate>
            </Provider>
        );
    }
}

/**
 * Render the main / root application.
 *
 * $FlowFixMe.
 */
render(<Root />, document.getElementById('app'));
