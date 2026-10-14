
import React, { Component } from 'react';
import { WithTranslation, withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { Dispatch, compose } from 'redux';

import type { IState } from '../../../types';
import config from '../../config';
import FieldText from '../../shared/components/FieldText';
import { normalizeServerURL } from '../../utils';
import { isAllowedHost, parseAuthority } from '../../utils/hostAllowList';
import { setServerURL } from '../actions';
import { Form } from '../styled';

interface IProps extends WithTranslation {
    _serverURL?: string;
    dispatch: Dispatch;
}

interface IServerURLFieldState {
    isValid: boolean;
    serverURL?: string;
}

/**
 * Default Server URL field text placed in the Settings drawer.
 */
class ServerURLField extends Component<IProps, IServerURLFieldState> {
    /**
     * Initializes a new {@code ServerURLField} instance.
     *
     * @inheritdoc
     */
    constructor(props: IProps) {
        super(props);

        this.state = {
            isValid: true,
            serverURL: props._serverURL
        };

        this._onServerURLChange = this._onServerURLChange.bind(this);
        this._onServerURLSubmit = this._onServerURLSubmit.bind(this);
    }

    /**
     * Render function of component.
     *
     * @returns {ReactElement}
     */
    render() {
        const { t } = this.props;

        return (
            <Form onSubmit = { this._onServerURLSubmit }>
                <FieldText
                    invalidMessage = { t('settings.invalidServer') }
                    isInvalid = { !this.state.isValid }
                    isValidationHidden = { this.state.isValid }
                    label = { t('settings.serverUrl') }
                    onBlur = { this._onServerURLSubmit }
                    onChange = { this._onServerURLChange }
                    placeholder = { config.defaultServerURL }
                    shouldFitContainer = { true }
                    type = 'text'
                    value = { this.state.serverURL } />
            </Form>
        );
    }


    /**
     * Updates Server URL in (redux) state when it is updated.
     *
     * @param {SyntheticInputEvent<HTMLInputElement>} event - Event by which
     * this function is called.
     * @returns {void}
     */
    _onServerURLChange(event: React.ChangeEvent<HTMLInputElement>) {
        this.setState({
            serverURL: event.currentTarget.value
        }, this._validateServerURL);
    }


    /**
     * Updates Server URL in (redux) store when it is updated.
     *
     * A server other than the default kMeet one (e.g. preprod) is confirmed
     * through a native dialog in the main process before it is stored.
     *
     * @param {Event} event - Event by which this function is called.
     * @returns {void}
     */
    _onServerURLSubmit(event: React.FormEvent) {
        event.preventDefault();

        if (!this.state.isValid) {
            return;
        }

        const serverURL = this.state.serverURL ?? '';
        const parsed = parseAuthority(serverURL);
        const defaultHost = parseAuthority(config.defaultServerURL)?.hostname ?? '';

        if (!serverURL.trim() || !parsed || parsed.hostname === defaultHost) {
            this.props.dispatch(setServerURL(serverURL));

            return;
        }

        window.jitsiNodeAPI.confirmExternalServer(parsed.origin).then(confirmed => {
            if (confirmed) {
                this.props.dispatch(setServerURL(parsed.origin));
            }
        });
    }

    /**
     * Validates the Server URL.
     *
     * @returns {void}
     */
    _validateServerURL() {
        const serverURL = this.state.serverURL ?? '';

        if (!serverURL.trim()) {
            return true;
        }

        const url = normalizeServerURL(serverURL);
        let isValid;

        try {
            // eslint-disable-next-line no-new
            const tmp = new URL(url);

            if (!tmp.protocol.startsWith('http')) {
                throw new Error('Invalid protocol');
            }

            // The conference iframe may only ever load an allowed host, so
            // anything else is invalid input, not merely unconfirmed.
            const parsed = parseAuthority(url);

            if (!parsed || !isAllowedHost(parsed.hostname)) {
                throw new Error('Server not allowed');
            }

            isValid = true;
        } catch (_) {
            isValid = false;
        }

        this.setState({ isValid });
    }
}

/**
 * Maps (parts of) the redux store to the React props.
 *
 * @param {Object} state - The redux state.
 * @returns {{
 *     _serverURL
 * }}
 */
function _mapStateToProps(state: IState) {
    return {
        _serverURL: state.settings.serverURL
    };
}

// redux's compose() returns a loosely-typed function; cast so the connected +
// translated component is usable as JSX / a ComponentType by consumers.
export default compose(connect(_mapStateToProps), withTranslation())(ServerURLField) as React.ComponentType<any>;
