// @flow
import React, { Component } from 'react';
import type { Dispatch } from 'redux';

import { getExternalApiURL } from '../../utils';

import { Wrapper } from '../styled';
import { LoadingIndicator } from '../../conference/styled';
import Spinner from '@atlaskit/spinner';
import {
    initPopupsConfigurationRender,
    RemoteControl,
    setupScreenSharingRender
} from 'jitsi-meet-electron-utils';
import config from '../../config';
import { push, replace } from 'react-router-redux';
import { compose } from 'redux';
import { withTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import { setServerURL } from '../../settings';

type Props = {

    /**
     * Redux dispatch.
     */
    dispatch: Dispatch<*>;
};

type State = {

    /**
     * URL of the room to join.
     * If this is not a url it will be treated as room name for default domain.
     */
    url: string;
};

/**
 * Welcome Component.
 */
class Welcome extends Component<Props, State> {

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

        // Initialize url value in state if passed using location state object.
        const url = '';

        this.state = { url };

        this._ref = React.createRef();
    }

    /**
     * Start Onboarding once component is mounted.
     *
     * NOTE: It autonatically checks if the onboarding is shown or not.
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
            onload: this._onIframeLoad,
            parentNode
        });
        initPopupsConfigurationRender(this._api);

        const iframe = this._api.getIFrame();

        setupScreenSharingRender(this._api);
        new RemoteControl(iframe); // eslint-disable-line no-new

        this._api.on('videoConferenceBeforeJoining',
            (conferenceInfo: Object) => {
                try {
                    // eslint-disable-next-line no-new
                    const roomUrl = new URL(conferenceInfo.roomSubject);

                    this.props.dispatch(setServerURL(roomUrl.origin));

                    this.props.dispatch(replace('/'));
                    this.props.dispatch(
                        push('/conference', {
                            room: roomUrl.pathname.replace('/', '')
                        }));

                    return;
                } catch (error) {
                    // we didn't pass url in subject we can move in a classic way
                    this.props.dispatch(setServerURL(conferenceInfo.serverURL));
                    this.props.dispatch(replace('/'));
                    this.props.dispatch(
                        push('/conference', {
                            room: encodeURIComponent(decodeURIComponent(conferenceInfo.roomName)),
                            subject: conferenceInfo.roomSubject
                        }));
                }
            }
        );
    }

    /**
     * Render function of component.
     *
     * @returns {ReactElement}
     */
    render() {
        return (
            <Wrapper innerRef = { this._ref }>
                { this._maybeRenderLoadingIndicator() }
            </Wrapper>
        );
    }

    /**
     * It renders a loading indicator, if appropriate.
     *
     * @returns {?ReactElement}
     */
    _maybeRenderLoadingIndicator() {
        if (this.state.isLoading) {
            return (
                <LoadingIndicator>
                    <Spinner size = 'large' />
                </LoadingIndicator>
            );
        }
    }
}

export default compose(connect(), withTranslation())(Welcome);
