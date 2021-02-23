// @flow
import React, { Component } from 'react';
import type { Dispatch } from 'redux';

import { getExternalApiURL } from '../../utils';

import { Wrapper } from '../styled';
import {
    initPopupsConfigurationRender,
    RemoteControl,
    setupScreenSharingRender
} from 'jitsi-meet-electron-utils';
import config from '../../config';
import { compose } from 'redux';
import { connect } from 'react-redux';

type Props = {

    /**
     * Redux dispatch.
     */
    dispatch: Dispatch<*>;
};

/**
 * Welcome Component.
 */
class Welcome extends Component<Props> {

    /**
     * External API object.
     */
    _api: Object;

    /**
     * Reference to the element of this component.
     */
    _ref: Object;

    /**
     * Initializes a new {@code Welcome} instance.
     *
     * @inheritdoc
     */
    constructor(props: Props) {
        super(props);

        this._ref = React.createRef();
    }

    /**
     * Mount iframe.
     *
     * @returns {void}
     */
    componentDidMount() {
        const parentNode = this._ref.current;
        const script = document.createElement('script');

        script.async = true;
        script.onload = () => this._onScriptLoad(parentNode);
        script.src = getExternalApiURL(config.defaultServerURL.replace(/https?:\/\//, ''));

        this._ref.current.appendChild(script);
    }

    /**
     * Remove conference on unmounting.
     *
     * @returns {void}
     */
    componentWillUnmount() {
        if (this._api) {
            this._api.dispose();
        }
    }

    /**
     * When the script is loaded create the iframe element in this component
     * and attach utils from jitsi-meet-electron-utils.
     *
     * @param {Object} parentNode - Node to which iframe has to be attached.
     * @returns {void}
     */
    _onScriptLoad(parentNode: Object) {
        const JitsiMeetExternalAPI = window.JitsiMeetExternalAPI;

        const host = config.defaultServerURL.replace(/https?:\/\//, '');
        const configOverwrite = {};

        this._api = new JitsiMeetExternalAPI(host, {
            configOverwrite,
            parentNode
        });
        initPopupsConfigurationRender(this._api);

        const iframe = this._api.getIFrame();

        setupScreenSharingRender(this._api);
        new RemoteControl(iframe); // eslint-disable-line no-new
    }

    /**
     * Render function of component.
     *
     * @returns {ReactElement}
     */
    render() {
        return (
            <Wrapper innerRef = { this._ref } />
        );
    }
}

export default compose(connect())(Welcome);
