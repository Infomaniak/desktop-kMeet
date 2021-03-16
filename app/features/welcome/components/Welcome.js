// @flow
import React, { Component } from 'react';
import type { Dispatch } from 'redux';
import { Wrapper } from '../styled';
import config from '../../config';
import { compose } from 'redux';
import { connect } from 'react-redux';
import JitsiMeetExternalAPI from '../../conference/external_api';

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
        const host = config.defaultServerURL.replace(/https?:\/\//, '');
        const options = {
            parentNode: this._ref.current
        };

        this._api = new JitsiMeetExternalAPI(host, {
            ...options
        });

        const { RemoteControl,
            RemoteDraw,
            setupScreenSharingRender,
            initPopupsConfigurationRender
        } = window.jitsiNodeAPI.jitsiMeetElectronUtils;

        initPopupsConfigurationRender(this._api);

        const iframe = this._api.getIFrame();

        setupScreenSharingRender(this._api);
        new RemoteControl(iframe); // eslint-disable-line no-new
        new RemoteDraw(iframe); // eslint-disable-line no-new
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
