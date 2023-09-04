// @flow
import React, { Component } from 'react';
import { compose } from 'redux';
import type { Dispatch } from 'redux';
import { Wrapper } from '../styled';
import { connect } from 'react-redux';
import { generateRoomWithoutSeparator } from '@jitsi/js-utils/random';
import JitsiMeetExternalAPI from '../../conference/external_api';
import config from '../../config';

type Props = {

    /**
     * Redux dispatch.
     */
    dispatch: Dispatch<*>;

    /**
     * React Router location object.
     */
    location: Object;

    /**
     * I18next translate function.
     */
     t: Function;
};

type State = {

    /**
     * Timer for animating the room name geneeration.
     */
    animateTimeoutId: ?TimeoutID,

    /**
     * Generated room name.
     */
    generatedRoomname: string,

    /**
     * Current room name placeholder.
     */
    roomPlaceholder: string,

    /**
     * Timer for re-generating a new room name.
     */
    updateTimeoutId: ?TimeoutID,

    /**
     * URL of the room to join.
     * If this is not a url it will be treated as room name for default domain.
     */
    url: string;
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

        // const {
        //     RemoteControl,
        //     RemoteDraw,
        //     setupScreenSharingRender,
        //     initPopupsConfigurationRender
        // } = window.jitsiNodeAPI.jitsiMeetElectronUtils;

        // initPopupsConfigurationRender(this._api);

        // const iframe = this._api.getIFrame();

        // setupScreenSharingRender(this._api);

        // new RemoteControl(iframe); // eslint-disable-line no-new
        // new RemoteDraw(iframe); // eslint-disable-line no-new

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

        // this._updateRoomname();
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

    /**
     * Todo.
     *
     * @returns {void}
     */
    _listenOnProtocolCreateMeeting() {
        this._api.executeCommand('startNewMeeting');
    }

    _listenOnProtocolJoinMeeting: (*) => void;

    /**
     * Todo.
     *
     * @returns {void}
     */
    _listenOnProtocolJoinMeeting() {
        this._api.executeCommand('joinMeeting');
    }

    _listenOnProtocolPlanMeeting: (*) => void;

    /**
     * Todo.
     *
     * @returns {void}
     */
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

    _updateRoomname: () => void;

    /**
     * Triggers the generation of a new room name and initiates an animation of
     * its changing.
     *
     * @protected
     * @returns {void}
     */
    _updateRoomname() {
        const generatedRoomname = generateRoomWithoutSeparator();
        const roomPlaceholder = '';
        const updateTimeoutId = setTimeout(this._updateRoomname, 10000);

        this._clearTimeouts();
        this.setState(
            {
                generatedRoomname,
                roomPlaceholder,
                updateTimeoutId
            },
            () => this._animateRoomnameChanging(generatedRoomname));
    }
}

export default compose(connect())(Welcome);
