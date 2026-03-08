/**
 * @fileoverview Co-host manager for handling invitations, approvals, and stream coordination
 * @modular Isolated co-host management module with no direct dependencies on core files
 * @errorhandling Includes comprehensive error handling and timeout mechanisms
 * @boundaries Maintains strict boundaries between host and co-host communication
 */

/**
 * Co-host Manager - Client-side implementation for handling co-host invitations and coordination
 * This operates as an isolated module with no direct modifications to the core code.
 */
class CohostManager {
  /**
   * Creates a new CohostManager instance
   * @param {Object} options Configuration options
   * @param {Object} options.socket The socket.io connection
   * @param {string} options.streamId The current stream ID
   * @param {string} options.sellerId The current seller/broadcaster ID
   * @param {Function} options.onStatusChange Callback for status changes
   * @param {Function} options.onError Callback for errors
   * @param {Object} options.mediasoup MediaSoup client object
   */
  constructor(options) {
    // Core references (provided externally)
    this.socket = options.socket;
    this.streamId = options.streamId;
    this.sellerId = options.sellerId;
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onError = options.onError || ((err) => console.error(err));
    this.mediasoup = options.mediasoup;
    
    // Co-host state management
    this.isHost = false;
    this.isCohost = false;
    this.activeInvites = new Map(); // Map of pendingUserId -> {timestamp, timeout}
    this.cohosts = new Map(); // Map of cohostId -> {sellerId, status, videoProducerId, audioProducerId}
    this.inviteTimeoutMs = 30000; // 30 seconds for invite timeout
    this.maxCohosts = 2; // Maximum number of co-hosts allowed
    
    // Transport references
    this.device = null;
    this.producerTransport = null;
    this.consumerTransport = null;
    this.videoProducer = null;
    this.audioProducer = null;
    this.localStream = null;
    this.consumers = new Map(); // Store consumers for cleanup
    
    // Bind socket event listeners
    this._bindEvents();
  }
  
  /**
   * Initialize as the stream host
   * @returns {Promise<boolean>} True if successfully initialized as host
   */
  async initAsHost() {
    try {
      this.isHost = true;
      this.onStatusChange({ role: 'host', status: 'active' });
      return true;
    } catch (err) {
      this.onError(err);
      return false;
    }
  }
  
  /**
   * Bind all necessary socket events for co-host coordination
   * @private
   */
  _bindEvents() {
    // Handle co-host invite requests (as host)
    this.socket.on('cohost:requestInvite', async (data, callback) => {
      if (!this.isHost) return;
      
      const { sellerId, socketId } = data;
      
      // Check if we've reached the maximum number of co-hosts
      if (this.cohosts.size >= this.maxCohosts) {
        callback({ success: false, reason: 'maxCohost' });
        return;
      }
      
      // Create an invitation with timeout
      const inviteId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const timeout = setTimeout(() => {
        this._handleInviteTimeout(inviteId, socketId);
      }, this.inviteTimeoutMs);
      
      this.activeInvites.set(socketId, { 
        inviteId, 
        sellerId, 
        timestamp: Date.now(), 
        timeout 
      });
      
      callback({ 
        success: true, 
        inviteId, 
        timeoutMs: this.inviteTimeoutMs 
      });
      
      // Trigger UI update
      this.onStatusChange({ 
        type: 'inviteSent', 
        sellerId, 
        socketId, 
        inviteId 
      });
    });
    
    // Handle co-host invite responses (as host)
    this.socket.on('cohost:inviteResponse', async (data) => {
      const { inviteId, accepted, socketId } = data;
      
      // Check if this invite exists
      const invite = Array.from(this.activeInvites.values())
        .find(inv => inv.inviteId === inviteId);
      
      if (!invite) return;
      
      // Clear timeout for this invite
      clearTimeout(invite.timeout);
      this.activeInvites.delete(socketId);
      
      if (accepted) {
        // Add to co-hosts list with pending status
        this.cohosts.set(socketId, {
          sellerId: invite.sellerId,
          status: 'connecting',
          joined: Date.now()
        });
        
        // Notify UI
        this.onStatusChange({ 
          type: 'cohostConnecting', 
          sellerId: invite.sellerId, 
          socketId 
        });
      } else {
        // Notify UI that invite was declined
        this.onStatusChange({ 
          type: 'inviteDeclined', 
          sellerId: invite.sellerId, 
          socketId 
        });
      }
    });
    
    // Handle co-host connected event (as host)
    this.socket.on('cohost:connected', async (data) => {
      const { socketId, videoProducerId, audioProducerId } = data;
      
      if (this.cohosts.has(socketId)) {
        const cohostData = this.cohosts.get(socketId);
        cohostData.status = 'active';
        cohostData.videoProducerId = videoProducerId;
        cohostData.audioProducerId = audioProducerId;
        
        // FIXED: Consume co-host's stream when they connect
        if (this.isHost) {
          try {
            await this._consumeCohost(videoProducerId, audioProducerId, cohostData.sellerId);
          } catch (error) {
            console.error('Error consuming co-host stream:', error);
          }
        }
        
        // Notify UI
        this.onStatusChange({ 
          type: 'cohostActive', 
          sellerId: cohostData.sellerId, 
          socketId,
          videoProducerId,
          audioProducerId
        });
      }
    });
    
    // Handle co-host disconnection (as host)
    this.socket.on('cohost:disconnected', (data) => {
      const { socketId } = data;
      
      if (this.cohosts.has(socketId)) {
        const cohostData = this.cohosts.get(socketId);
        
        // Remove from co-hosts list
        this.cohosts.delete(socketId);
        
        // Clean up co-host video elements
        this._removeCoHostVideoElements(cohostData);
        
        // Notify UI
        this.onStatusChange({ 
          type: 'cohostDisconnected', 
          sellerId: cohostData.sellerId, 
          socketId 
        });
      }
    });

    // FIXED: Handle when co-host is removed by host
    this.socket.on('cohost:removed', (data) => {
      const { streamId } = data;
      
      if (this.isCohost && streamId === this.streamId) {
        // Co-host has been removed by host
        this._disconnectAsCohost();
        
        // Update UI to show as viewer
        this.onStatusChange({ 
          role: 'viewer', 
          status: 'removed',
          message: 'You have been removed from co-hosting'
        });
      }
    });

    // FIXED: Handle producer closed events (when someone leaves)
    this.socket.on('producerClosed', ({ producerId }) => {
      console.log(`Producer ${producerId} closed`);
      
      // Clean up consumer for this producer
      for (const [consumerId, consumer] of this.consumers.entries()) {
        if (consumer.producerId === producerId) {
          consumer.close();
          this.consumers.delete(consumerId);
        }
      }
      
      // Remove video elements for this producer
      this._removeVideoElementsByProducerId(producerId);
    });
    
    // Handle invite received (as potential co-host)
    this.socket.on('cohost:inviteReceived', (data, callback) => {
      const { inviteId, hostSellerId, timeoutMs } = data;
      
      // Notify UI about invite
      this.onStatusChange({ 
        type: 'inviteReceived', 
        hostSellerId, 
        inviteId,
        timeoutMs,
        respond: (accepted) => {
          this._respondToInvite(inviteId, accepted);
          callback({ received: true });
        }
      });
    });
    
    // Handle accepted as co-host (as co-host)
    this.socket.on('cohost:accepted', async (data) => {
      const { roomId, hostSellerId } = data;
      
      this.isCohost = true;
      
      // Notify UI
      this.onStatusChange({ 
        role: 'cohost', 
        status: 'connecting',
        hostSellerId 
      });
      
      // Connect as co-host
      await this._connectAsCohost(roomId);
    });

    // FIXED: Listen for new producers (when host or other co-hosts join)
    this.socket.on('newProducer', async ({ producerId, kind }) => {
      if (this.isCohost && this.device) {
        try {
          console.log(`New ${kind} producer available: ${producerId}`);
          await this._consumeProducer(producerId, kind, this.streamId);
        } catch (error) {
          console.error(`Error consuming new producer ${producerId}:`, error);
        }
      }
    });
  }
  
  /**
   * Handle an invite timing out
   * @param {string} inviteId The ID of the invitation that timed out
   * @param {string} socketId The socket ID of the invited user
   * @private
   */
  _handleInviteTimeout(inviteId, socketId) {
    if (this.activeInvites.has(socketId)) {
      const invite = this.activeInvites.get(socketId);
      
      // Remove the invite
      this.activeInvites.delete(socketId);
      
      // Notify the socket that the invite expired
      this.socket.emit('cohost:inviteExpired', { 
        inviteId, 
        socketId 
      });
      
      // Notify UI
      this.onStatusChange({ 
        type: 'inviteExpired', 
        sellerId: invite.sellerId, 
        socketId 
      });
    }
  }
  
  /**
   * Respond to a co-host invitation
   * @param {string} inviteId The ID of the invitation
   * @param {boolean} accepted Whether the invitation was accepted
   * @private
   */
  _respondToInvite(inviteId, accepted) {
    this.socket.emit('cohost:inviteResponse', {
      inviteId,
      accepted,
      socketId: this.socket.id
    });
  }
  
  /**
   * Connect to the stream as a co-host
   * @param {string} roomId The room ID to connect to
   * @private
   */
  async _connectAsCohost(roomId) {
    try {
      console.log(`Starting co-host connection to room: ${roomId}`);
      
      // Get router capabilities
      console.log('Getting router RTP capabilities...');
      const routerRtpCapabilities = await new Promise((resolve, reject) => {
        this.socket.emit('getRouterRtpCapabilities', { roomId }, (data) => {
          if (data.error) {
            reject(new Error(data.error));
          } else {
            resolve(data);
          }
        });
      });
      console.log('Router RTP capabilities received');
      
      // Load mediasoup device
      console.log('Loading MediaSoup device...');
      this.device = new this.mediasoup.Device();
      await this.device.load({ routerRtpCapabilities });
      console.log('MediaSoup device loaded successfully');
      
      // Get user media
      console.log('Getting user media...');
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }
      });
      console.log('User media obtained');
      
      // Create producer transport first (for sending co-host's stream)
      console.log('Creating producer transport...');
      await this._createProducerTransport(roomId);
      console.log('Producer transport created');
      
      // Create consumer transport (for receiving host's stream)
      console.log('Creating consumer transport...');
      await this._createConsumerTransport(roomId);
      console.log('Consumer transport created');
      
      // FIXED: Get active producers (host's stream) and consume them
      console.log('Getting existing producers in room...');
      const producers = await new Promise((resolve, reject) => {
        this.socket.emit('getProducers', { roomId }, (response) => {
          console.log('getProducers response:', response);
          if (response && response.error) {
            reject(new Error(response.error));
          } else {
            // Handle both array response and object with producers array
            const producerList = Array.isArray(response) ? response : (response.producers || response || []);
            resolve(producerList);
          }
        });
      });
      
      console.log(`Found ${producers.length} existing producers to consume`);
      
      // Consume existing producers (host and other co-hosts)
      if (producers && producers.length > 0) {
        for (const producer of producers) {
          try {
            console.log(`Consuming existing producer: ${producer.producerId} (${producer.kind})`);
            await this._consumeProducer(producer.producerId, producer.kind, roomId);
          } catch (error) {
            console.error(`Error consuming existing producer ${producer.producerId}:`, error);
            this.onError(error);
          }
        }
      } else {
        console.log('No existing producers found to consume');
      }
      
      // Update UI
      this.onStatusChange({ 
        role: 'cohost', 
        status: 'active'
      });
      
      console.log('Co-host connection completed successfully');
      return true;
    } catch (err) {
      console.error('Error in co-host connection:', err);
      this.onError(err);
      
      // Disconnect as co-host
      this._disconnectAsCohost();
      
      // Update UI
      this.onStatusChange({ 
        role: 'viewer', 
        status: 'error',
        error: err.message
      });
      
      return false;
    }
  }

  /**
   * FIXED: Consume a co-host's stream (for host)
   * @param {string} videoProducerId Video producer ID
   * @param {string} audioProducerId Audio producer ID
   * @param {string} sellerId Seller ID for labeling
   * @private
   */
  async _consumeCohost(videoProducerId, audioProducerId, sellerId) {
    try {
      // Create consumer transport if not exists
      if (!this.consumerTransport) {
        await this._createConsumerTransport(this.streamId);
      }

      // Consume video
      if (videoProducerId) {
        await this._consumeProducer(videoProducerId, 'video', this.streamId, sellerId);
      }

      // Consume audio
      if (audioProducerId) {
        await this._consumeProducer(audioProducerId, 'audio', this.streamId, sellerId);
      }

      console.log(`Successfully consuming co-host ${sellerId} streams`);
    } catch (error) {
      console.error('Error consuming co-host streams:', error);
      throw error;
    }
  }

  /**
   * FIXED: Consume a producer from another participant
   * @param {string} producerId The ID of the producer to consume
   * @param {string} kind The kind of the producer (video/audio)
   * @param {string} roomId The room ID
   * @param {string} sellerId Optional seller ID for labeling
   * @private
   */
  async _consumeProducer(producerId, kind, roomId, sellerId = null) {
    try {
      console.log(`Starting to consume ${kind} producer: ${producerId}`);
      
      // Create consumer transport if not exists
      if (!this.consumerTransport) {
        console.log('Creating consumer transport...');
        await this._createConsumerTransport(roomId);
      }

      // Request consumption from the server
      console.log(`Requesting consumption for producer ${producerId}`);
      const response = await new Promise((resolve, reject) => {
        this.socket.emit('consume', {
          producerId,
          transportId: this.consumerTransport.id,
          roomId,
          rtpCapabilities: this.device.rtpCapabilities
        }, (response) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });
      
      console.log(`Consume response for ${producerId}:`, response);
      
      // Create the consumer
      const consumer = await this.consumerTransport.consume({
        id: response.id,
        producerId,
        kind,
        rtpParameters: response.rtpParameters
      });
      
      console.log(`Consumer created for ${kind} producer ${producerId}:`, consumer.id);
      
      // Store the consumer with producer ID for tracking
      this.consumers.set(consumer.id, {
        consumer,
        producerId,
        kind
      });
      
      // Resume the consumer
      await consumer.resume();
      console.log(`Consumer ${consumer.id} resumed`);
      
      // Create video element for this consumed stream
      this._createVideoElement(consumer, producerId, sellerId);
      
      console.log(`Successfully consuming ${kind} producer ${producerId}`);
      return consumer;
    } catch (error) {
      console.error(`Error consuming producer ${producerId}:`, error);
      return null;
    }
  }

  /**
   * FIXED: Create or update video element for consumed stream
   * @param {Object} consumer MediaSoup consumer
   * @param {string} producerId Producer ID
   * @param {string} sellerId Seller ID for labeling
   * @private
   */
  _createVideoElement(consumer, producerId, sellerId) {
    const container = document.getElementById('video-container') || document.body;
    
    let videoElement = document.getElementById(`video-${producerId}`);
    
    if (!videoElement) {
      videoElement = document.createElement('video');
      videoElement.id = `video-${producerId}`;
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.muted = true; // Start muted to avoid autoplay issues
      videoElement.style.width = '200px';
      videoElement.style.height = '150px';
      videoElement.style.objectFit = 'cover';
      videoElement.style.border = '2px solid #007bff';
      videoElement.style.borderRadius = '8px';
      videoElement.style.margin = '5px';
      
      // Add label
      const label = document.createElement('div');
      label.textContent = sellerId || `Producer ${producerId.substring(0, 8)}`;
      label.style.position = 'absolute';
      label.style.bottom = '5px';
      label.style.left = '5px';
      label.style.backgroundColor = 'rgba(0,0,0,0.7)';
      label.style.color = 'white';
      label.style.padding = '2px 5px';
      label.style.fontSize = '12px';
      label.style.borderRadius = '3px';
      
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.display = 'inline-block';
      wrapper.appendChild(videoElement);
      wrapper.appendChild(label);
      
      container.appendChild(wrapper);
    }
    
    // Create or update stream
    let stream = videoElement.srcObject;
    if (!stream) {
      stream = new MediaStream();
      videoElement.srcObject = stream;
    }
    
    // Add the track to the stream
    if (consumer.track) {
      // Remove existing tracks of the same kind
      stream.getTracks().forEach(track => {
        if (track.kind === consumer.track.kind) {
          stream.removeTrack(track);
        }
      });
      
      // Add the new track
      stream.addTrack(consumer.track);
    }
    
    // Attempt to play
    videoElement.play().catch(err => {
      console.log('Autoplay prevented, user interaction required:', err);
    });
  }
  
  /**
   * Create a producer transport with simulcast support
   * @param {string} roomId The room ID
   * @private
   */
  async _createProducerTransport(roomId) {
    // Request the server to create a producer transport
    const transportOptions = await new Promise((resolve, reject) => {
      this.socket.emit('createProducerTransport', { roomId }, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
    
    // Create the transport on client side
    this.producerTransport = this.device.createSendTransport(transportOptions);
    
    // Handle transport events
    this.producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await new Promise((resolve, reject) => {
          this.socket.emit('connectProducerTransport', { dtlsParameters, roomId }, (response) => {
            if (response.error) {
              reject(new Error(response.error));
            } else {
              resolve(response);
            }
          });
        });
        
        callback();
      } catch (error) {
        errback(error);
      }
    });
    
    this.producerTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
      try {
        const { id } = await new Promise((resolve, reject) => {
          this.socket.emit('produce', { kind, rtpParameters, roomId }, (response) => {
            if (response.error) {
              reject(new Error(response.error));
            } else {
              resolve(response);
            }
          });
        });
        
        callback({ id });
      } catch (error) {
        errback(error);
      }
    });
    
    // Add connection state change monitoring
    this.producerTransport.on('connectionstatechange', (state) => {
      if (state === 'connected') {
        // Successfully connected
        this.onStatusChange({ 
          type: 'transport', 
          state: 'connected' 
        });
      } else if (state === 'failed' || state === 'closed') {
        // Connection failed
        this._disconnectAsCohost();
        
        this.onStatusChange({ 
          type: 'transport', 
          state: 'failed' 
        });
      }
    });
    
    // Produce audio with standard parameters
    this.audioProducer = await this.producerTransport.produce({
      track: this.localStream.getAudioTracks()[0],
      codecOptions: {
        opusStereo: true,
        opusDtx: true,
      },
    });
    
    // Produce video with simulcast parameters
    this.videoProducer = await this.producerTransport.produce({
      track: this.localStream.getVideoTracks()[0],
      encodings: [
        { scaleResolutionDownBy: 4, maxBitrate: 500000 },
        { scaleResolutionDownBy: 2, maxBitrate: 1000000 },
        { scaleResolutionDownBy: 1, maxBitrate: 2500000 }
      ],
      codecOptions: {
        videoGoogleStartBitrate: 1000,
      },
    });
    
    // Notify server that we're connected as co-host
    this.socket.emit('cohost:connected', {
      roomId,
      socketId: this.socket.id,
      sellerId: this.sellerId,
      videoProducerId: this.videoProducer.id,
      audioProducerId: this.audioProducer.id
    });
  }
  
  /**
   * Create a consumer transport for receiving host's stream
   * @param {string} roomId The room ID
   * @private
   */
  async _createConsumerTransport(roomId) {
    try {
      // Request the server to create a consumer transport
      const transportOptions = await new Promise((resolve, reject) => {
        this.socket.emit('createConsumerTransport', { roomId }, (response) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });
      
      // Create the transport on client side
      this.consumerTransport = this.device.createRecvTransport(transportOptions);
      
      // Handle transport events
      this.consumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          await new Promise((resolve, reject) => {
            this.socket.emit('connectConsumerTransport', { 
              dtlsParameters, 
              roomId,
              transportId: this.consumerTransport.id 
            }, (response) => {
              if (response.error) {
                reject(new Error(response.error));
              } else {
                resolve(response);
              }
            });
          });
          
          callback();
        } catch (error) {
          errback(error);
        }
      });
      
      return this.consumerTransport;
    } catch (error) {
      this.onError(error);
      return null;
    }
  }
  
  /**
   * FIXED: Remove video elements when co-host disconnects
   * @param {Object} cohostData Co-host data containing producer IDs
   * @private
   */
  _removeCoHostVideoElements(cohostData) {
    // Remove video elements for this co-host
    if (cohostData.videoProducerId) {
      this._removeVideoElementsByProducerId(cohostData.videoProducerId);
    }
    if (cohostData.audioProducerId) {
      this._removeVideoElementsByProducerId(cohostData.audioProducerId);
    }
  }

  /**
   * FIXED: Remove video elements by producer ID
   * @param {string} producerId Producer ID to remove
   * @private
   */
  _removeVideoElementsByProducerId(producerId) {
    // Remove co-host video elements (for host viewing co-host)
    const cohostVideo = document.getElementById(`cohost-video-${producerId}`);
    if (cohostVideo && cohostVideo.parentElement) {
      cohostVideo.parentElement.remove(); // Remove wrapper too
    }
    
    // Remove host video elements (for co-host viewing host)
    const hostVideo = document.getElementById(`host-video-${producerId}`);
    if (hostVideo && hostVideo.parentElement) {
      hostVideo.parentElement.remove(); // Remove wrapper too
    }
    
    // Also remove any generic video elements
    const genericVideo = document.getElementById(`video-${producerId}`);
    if (genericVideo && genericVideo.parentElement) {
      genericVideo.parentElement.remove();
    }
  }
  
  /**
   * FIXED: Disconnect as a co-host with proper event emission
   * @private
   */
  _disconnectAsCohost() {
    // Clean up video elements first
    const hostContainer = document.getElementById('host-videos-container');
    if (hostContainer) {
      hostContainer.remove();
    }

    // Close consumers
    if (this.consumers) {
      this.consumers.forEach(consumer => {
        consumer.close();
      });
      this.consumers.clear();
    }
    
    // Close consumer transport
    if (this.consumerTransport) {
      this.consumerTransport.close();
      this.consumerTransport = null;
    }
    
    // Close producers
    if (this.videoProducer) {
      this.videoProducer.close();
      this.videoProducer = null;
    }
    
    if (this.audioProducer) {
      this.audioProducer.close();
      this.audioProducer = null;
    }
    
    // Close producer transport
    if (this.producerTransport) {
      this.producerTransport.close();
      this.producerTransport = null;
    }
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    this.isCohost = false;
    
    // FIXED: Emit co-host disconnection event instead of stream end
    if (this.socket && this.socket.connected) {
      this.socket.emit('cohost:disconnected', {
        socketId: this.socket.id,
        streamId: this.streamId,
        sellerId: this.sellerId,
        // FIXED: Mark this as a co-host leaving, not stream ending
        isCohost: true
      });
    }
  }
  
  /**
   * Send an invitation to become a co-host
   * @param {string} targetSellerId The seller ID to invite
   * @returns {Promise<Object>} Response object with success status
   */
  async inviteCohost(targetSellerId) {
    if (!this.isHost) {
      throw new Error('Only the host can send co-host invitations');
    }
    
    if (this.cohosts.size >= this.maxCohosts) {
      throw new Error(`Maximum of ${this.maxCohosts} co-hosts already reached`);
    }
    
    return new Promise((resolve, reject) => {
      this.socket.emit('cohost:sendInvite', {
        targetSellerId,
        hostSellerId: this.sellerId,
        streamId: this.streamId,
        timeoutMs: this.inviteTimeoutMs
      }, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }
  
  /**
   * Remove a co-host from the stream
   * @param {string} cohostSocketId The socket ID of the co-host to remove
   * @returns {Promise<Object>} Response object with success status
   */
  async removeCohost(cohostSocketId) {
    if (!this.isHost) {
      throw new Error('Only the host can remove co-hosts');
    }
    
    if (!this.cohosts.has(cohostSocketId)) {
      throw new Error('Co-host not found');
    }
    
    return new Promise((resolve, reject) => {
      this.socket.emit('cohost:remove', {
        cohostSocketId,
        streamId: this.streamId
      }, (response) => {
        if (response.error) {
          reject(new Error(response.error));
        } else {
          // Remove from local tracking
          this.cohosts.delete(cohostSocketId);
          
          // Notify UI
          this.onStatusChange({ 
            type: 'cohostRemoved', 
            socketId: cohostSocketId 
          });
          
          resolve(response);
        }
      });
    });
  }
  
  /**
   * FIXED: Leave the stream as a co-host without ending the entire stream
   * @returns {Promise<boolean>} True if successfully left
   */
  async leaveAsCohost() {
    if (!this.isCohost) {
      return false;
    }
    
    // FIXED: Clean disconnect that doesn't end the stream
    this._disconnectAsCohost();
    
    // Update UI
    this.onStatusChange({ 
      role: 'viewer', 
      status: 'active' 
    });
    
    return true;
  }
  
  /**
   * Clean up resources when done with the manager
   */
  dispose() {
    // Clear all timeouts
    for (const invite of this.activeInvites.values()) {
      clearTimeout(invite.timeout);
    }
    
    // Disconnect as co-host if needed
    if (this.isCohost) {
      this._disconnectAsCohost();
    }
    
    // Clear maps
    this.activeInvites.clear();
    this.cohosts.clear();
    this.consumers.clear();
    
    // Remove socket listeners
    this.socket.off('cohost:requestInvite');
    this.socket.off('cohost:inviteResponse');
    this.socket.off('cohost:connected');
    this.socket.off('cohost:disconnected');
    this.socket.off('cohost:inviteReceived');
    this.socket.off('cohost:accepted');
    this.socket.off('newProducer');
  }
}

// Export the CohostManager class
export default CohostManager;