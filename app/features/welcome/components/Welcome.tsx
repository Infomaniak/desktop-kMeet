import React, { Component, createRef } from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { Dispatch } from 'redux';

import config from '../../config';
import JitsiMeetExternalAPI from '../../conference/external_api';
import { Wrapper } from '../styled';

interface IProps {
    dispatch: Dispatch;
    location?: {
        state?: {
            event?: string;
        };
    };
}

class Welcome extends Component<IProps> {
    _api: any;
    _ref: React.RefObject<any>;
    _unsubscribeProtocol: Array<() => void> = [];

    constructor(props: IProps) {
        super(props);

        this._ref = createRef();
        this._listenOnProtocolCreateMeeting
            = this._listenOnProtocolCreateMeeting.bind(this);
        this._listenOnProtocolJoinMeeting
            = this._listenOnProtocolJoinMeeting.bind(this);
        this._listenOnProtocolPlanMeeting
            = this._listenOnProtocolPlanMeeting.bind(this);
    }

    componentDidMount() {
        const host = config.defaultServerURL.replace(/https?:\/\//, '');

        this._api = new JitsiMeetExternalAPI(host, {
            parentNode: this._ref.current
        });

        this._unsubscribeProtocol = [
            window.jitsiNodeAPI.ipc.on('protocol-data-create-meeting', this._listenOnProtocolCreateMeeting),
            window.jitsiNodeAPI.ipc.on('protocol-data-join-meeting', this._listenOnProtocolJoinMeeting),
            window.jitsiNodeAPI.ipc.on('protocol-data-plan-meeting', this._listenOnProtocolPlanMeeting)
        ];

        if (this.props.location?.state?.event) {
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

    componentWillUnmount() {
        if (this._api) {
            this._api.dispose();
        }
        this._unsubscribeProtocol.forEach(unsubscribe => unsubscribe());
        this._unsubscribeProtocol = [];
    }

    _listenOnProtocolCreateMeeting() {
        this._api.executeCommand('startNewMeeting');
    }

    _listenOnProtocolJoinMeeting() {
        this._api.executeCommand('joinMeeting');
    }

    _listenOnProtocolPlanMeeting() {
        this._api.executeCommand('planMeeting');
    }

    render() {
        return (
            <Wrapper innerRef = { this._ref as any } />
        );
    }
}

export default compose(connect())(Welcome) as React.ComponentType<any>;
