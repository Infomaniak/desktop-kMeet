// @flow
import React, { Component } from 'react';
import type { Dispatch } from 'redux';
import { compose } from 'redux';
import { Wrapper } from '../styled';
import config from '../../config';
import { connect } from 'react-redux';
import JitsiMeetExternalAPI from '../../conference/external_api';

type Props = {

    /**
     * Redux dispatch.
     */
    dispatch: Dispatch<*>;

    /**
     * React Router location object.
     */
    location: Object;
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
        this._listenOnProtocolCreateMeeting
            = this._listenOnProtocolCreateMeeting.bind(this);
        this._listenOnProtocolJoinMeeting
            = this._listenOnProtocolJoinMeeting.bind(this);
        this._listenOnProtocolPlanMeeting
            = this._listenOnProtocolPlanMeeting.bind(this);
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

        const {
            RemoteControl,
            RemoteDraw,
            setupScreenSharingRender,
            initPopupsConfigurationRender
        } = window.jitsiNodeAPI.jitsiMeetElectronUtils;

        initPopupsConfigurationRender(this._api);

        const iframe = this._api.getIFrame();

        setupScreenSharingRender(this._api);

        new RemoteControl(iframe); // eslint-disable-line no-new
        new RemoteDraw(iframe); // eslint-disable-line no-new

        window.jitsiNodeAPI.ipc.on('protocol-data-create-meeting', this._listenOnProtocolCreateMeeting);
        window.jitsiNodeAPI.ipc.on('protocol-data-join-meeting', this._listenOnProtocolJoinMeeting);
        window.jitsiNodeAPI.ipc.on('protocol-data-plan-meeting', this._listenOnProtocolPlanMeeting);

        if (this.props.location.state && this.props.location.state.event) {
            switch (this.props.location.state.event) {
            case 'startNewMeeting':
                this._listenOnProtocolCreateMeeting();
                break;
            case 'joinMeeting':
                this._listenOnProtocolJoinMeeting();
                break;
            case 'planMeeting':
                this._listenOnProtocolPlanMeeting();
                break;
            }
        }
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
        window.jitsiNodeAPI.ipc.removeListener(
            'protocol-data-create-meeting',
            this._listenOnProtocolCreateMeeting
        );
        window.jitsiNodeAPI.ipc.removeListener(
            'protocol-data-join-meeting',
            this._listenOnProtocolJoinMeeting
        );
        window.jitsiNodeAPI.ipc.removeListener(
            'protocol-data-plan-meeting',
            this._listenOnProtocolPlanMeeting
        );
    }

    _listenOnProtocolCreateMeeting: (*) => void;

    _listenOnProtocolCreateMeeting() {
        this._api.executeCommand('startNewMeeting');
    }

    _listenOnProtocolJoinMeeting: (*) => void;

    _listenOnProtocolJoinMeeting() {
        this._api.executeCommand('joinMeeting');
    }

    _listenOnProtocolPlanMeeting: (*) => void;

    _listenOnProtocolPlanMeeting() {
        this._api.executeCommand('planMeeting');
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
