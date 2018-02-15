var H5P = H5P || {};
H5P.CKEDITOR = CKEDITOR;

H5P.IVOpenEndedQuestion = (function (EventDispatcher, $, CKEDITOR) {

  var counter = 0;

  function IVOpenEndedQuestion(params) {
    var self = this;
    var textAreaID = 'h5p-text-area-' + counter;
    counter += 1;

    var ck;

    params = $.extend({
      question: 'Question or description',
      placeholder: 'Enter your response here'
    }, params);

    // Ensure dialog doesn't overflow out of iframe
    CKEDITOR.on('dialogDefinition', function(e) {
      var dialogDefinition = e.data.definition;
      var dialogName = e.data.name;
      var dialog = e.data.definition.dialog;

      // Configure dialogs to hide unecessary elements
      if (dialogName == 'link') {
        var infoTab = dialogDefinition.getContents('info');
        infoTab.remove('linkType');
        infoTab.remove('anchorOptions');
        infoTab.remove('emailOptions');
      }

      // Prevent overflowing out of H5P iframe
      dialog.on('show', function () {
        var dialogBodyElement = this.getElement().find('.cke_dialog_body').$[0];
        $(dialogBodyElement).css({
          'max-height': 250,  // Hardcoded max height
          'overflow-y': 'scroll'
        });

        var dialogContents = this.getElement().find('.cke_dialog_contents').$[0];
        $(dialogContents).css('margin-top', 0);

        // Resize link dialog
        var dialogContentsBody = this.getElement().find('.cke_dialog_contents_body').$[0];
        $(dialogContentsBody).css('height', 'inherit');
      });
    });

    /**
     * Create the open ended question element
     * @returns {HTMLElement} Wrapper for open ended question
     */
    var createOpenEndedQuestion = function () {
      var wrapper = document.createElement('div');
      wrapper.classList.add('h5p-iv-open-ended-question');

      wrapper.append(createTextWrapper());
      wrapper.append(createInputWrapper());
      wrapper.append(createRequiredMessageWrapper());
      wrapper.append(createFooter());
      self.wrapper = wrapper;
      return wrapper;
    };

    /**
     * Create the wrapping element for the question text
     * @returns {HTMLElement} Question
     */
    var createTextWrapper = function () {
      self.textWrapper = document.createElement('div');
      self.textWrapper.classList.add('h5p-iv-open-ended-question-text-wrapper');

      var text = document.createElement('div');
      text.classList.add('h5p-iv-open-ended-question-text');
      text.innerHTML = params.question;

      if (params.isRequired == true) {
        var requiredText = document.createElement('div');
        requiredText.classList.add('h5p-iv-open-ended-required-text');
        requiredText.innerHTML = '*' + params.i10n.requiredText;
        self.textWrapper.append(requiredText);
      }

      self.textWrapper.append(text);

      return self.textWrapper;
    };

    /**
     * Create the wrapping element for the input
     * @returns {HTMLElement} Input
     */
    var createInputWrapper = function () {
      self.$inputWrapper = $('<div/>', {
        'class': 'h5p-iv-open-ended-question-input-wrapper'
      });

      var input = document.createElement('textarea');
      input.classList.add('h5p-iv-open-ended-question-input');
      input.id = textAreaID;
      input.rows = params.inputRows;
      input.placeholder = params.placeholder;

      // Initialize the CKEditor on focus and ensure it fits
      input.addEventListener('focus', function() {
        ck = CKEDITOR.replace(textAreaID);

        // Send an 'interacted' event every time the user exits the text area
        ck.on('blur', function() {
          self.createXAPIEvent('interacted', true);
        });
      });

      self.$inputWrapper.append(input);

      return self.$inputWrapper.get(0);
    };

    // Resize the CKEDITOR using jquery
    CKEDITOR.on('instanceLoaded', function(event) {
      if (event.editor.name !== textAreaID) {
        return; // Only resize the current editor
      }

      var containerHeight = self.$inputWrapper.height();
      var toolBarHeight = self.$inputWrapper.find('.cke_top').outerHeight();
      var editorFooterHeight = self.$inputWrapper.find('.cke_bottom').outerHeight();
      var offset = toolBarHeight + editorFooterHeight + 3;
      var padding = parseInt(self.$inputWrapper.css('padding').replace(/[^-\d\.]/g, ''));

      var realHeight = containerHeight - offset;
      var minHeight = 80;

      if (realHeight > minHeight) {
        self.$inputWrapper.find('.cke_contents').css('height', realHeight);
      }
      else {
        self.$inputWrapper.find('.cke_contents').css('height', minHeight);
        var header = $(self.textWrapper).outerHeight();
        var footer = $(self.footer).outerHeight();
        $(self.wrapper).css('min-height', minHeight + offset + padding + padding + header + footer);
      }
    });

    /**
     * Create the wrapping element for the warning message
     * @returns {HTMLElement} Warning message
     */
    var createRequiredMessageWrapper = function () {
      self.requiredMessageWrapper = document.createElement('div');
      self.requiredMessageWrapper.classList.add('h5p-iv-open-ended-question-required-wrapper');

      var requiredMessage = document.createElement('div');
      requiredMessage.classList.add('h5p-iv-open-ended-question-required-message');
      requiredMessage.innerHTML = params.i10n.requiredMessage;

      var requiredButton = document.createElement('button');
      requiredButton.classList.add('h5p-iv-open-ended-question-required-exit');
      requiredButton.addEventListener('click', function () {
        self.hideRequiredMessage();
      });

      self.requiredMessageWrapper.append(requiredMessage);
      self.requiredMessageWrapper.append(requiredButton);


      // Hide on creation
      self.hideRequiredMessage();

      return self.requiredMessageWrapper;
    };

    /**
     * Create the footer and associated buttons
     * @returns {HTMLElement} Footer
     */
    var createFooter = function () {
      self.footer = document.createElement('div');
      self.footer.classList.add('h5p-iv-open-ended-question-footer');

      self.submitButton = document.createElement('button');
      self.submitButton.classList.add('h5p-iv-open-ended-question-button-submit');
      self.submitButton.type = 'button';
      self.submitButton.innerHTML = params.i10n.submitButtonLabel;

      self.submitButton.addEventListener('click', function () {

        var answerGiven = CKEDITOR.instances[textAreaID] !== undefined && CKEDITOR.instances[textAreaID].getData().trim() !== '';

        if (!answerGiven && params.isRequired) {
          self.showRequiredMessage();
        }
        else {
          self.createXAPIEvent('answered', true);
          self.trigger('continue');
        }
      });

      if (params.isRequired == false) {
        var skipButton = document.createElement('button');
        skipButton.classList.add('h5p-iv-open-ended-question-button-skip');
        skipButton.type = 'button';
        skipButton.innerHTML = params.i10n.skipButtonLabel;

        skipButton.addEventListener('click', function () {
          self.createXAPIEvent('interacted', true);
          self.trigger('continue');
        });

        self.footer.append(skipButton);
      }

      self.footer.append(self.submitButton);

      return self.footer;
    };

    self.showRequiredMessage = function () {
      self.requiredMessageWrapper.classList.remove('h5p-iv-open-ended-question-hidden');
    };

    self.hideRequiredMessage = function () {
      self.requiredMessageWrapper.classList.add('h5p-iv-open-ended-question-hidden');
    };

    self.createXAPIEvent= function(type, trigger) {
      var xAPIEvent = this.createXAPIEventTemplate(type);

      // Add question to the definition of the xAPI statement
      var definition = xAPIEvent.getVerifiedStatementValue(['object', 'definition']);
      $.extend(definition, getXAPIDefinition(this.paramsquestion));

      // Add the response to the xAPI statement
      var response = (CKEDITOR.instances[textAreaID] ? CKEDITOR.instances[textAreaID].getData() : '');
      xAPIEvent.data.statement.result = {};
      xAPIEvent.data.statement.result.response = response + ''; // Convert to a string

      if (trigger) {
        self.trigger(xAPIEvent);
      }

      return xAPIEvent;
    };

    /**
     * Create a definition template
     * @param {String} question Question
     * @returns {Object} xAPI definition template
     */
    var getXAPIDefinition = function (question) {
      var definition = {};

      definition.interactionType = 'fill-in';
      definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
      definition.description = {
        'en-US': question // We don't know the language at runtime
      };
      definition.extensions = {
        'https://h5p.org/x-api/h5p-machine-name': 'H5P.IVOpenEndedQuestion'
      };

      return definition;
    };

    /**
     * Get xAPI data.
     * Contract used by report rendering engine.
     *
     * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
     * @returns {Object} xAPI data statement
     */
    self.getXAPIData = function () {
      var XAPIEvent = this.createXAPIEvent('answered', false);

      return {
        statement: XAPIEvent.data.statement
      };
    };

    /**
     * Listen to resize events in order to use smaller buttons
     * @returns {undefined}
     */
    var onResize = function() {
      var footerWidth = $(self.$container).width();
      var fontSize = parseInt($(self.$container).css('font-size'), 10);
      var widthToEmRatio = footerWidth / fontSize;
      var widthToEmThreshold = 23;

      if (widthToEmRatio <= widthToEmThreshold) {
        self.submitButton.innerHTML = '';
      }
      else {
        self.submitButton.innerHTML = params.i10n.submitButtonLabel;
      }
    };

    /**
     * Attach function called by H5P framework to insert H5P content into
     * page
     *
     * @param {jQuery} $container H5P Container the open ended question will be attached to
     * @returns {null} null
     */
    self.attach = function ($container) {
      self.$container = $container;
      $container.get(0).classList.add('h5p-iv-open-ended-question-wrapper');
      $container.append(createOpenEndedQuestion());
      self.on('resize', onResize);
    };
  }

  // Extends the event dispatcher
  IVOpenEndedQuestion.prototype = Object.create(EventDispatcher.prototype);
  IVOpenEndedQuestion.prototype.constructor = IVOpenEndedQuestion;

  return IVOpenEndedQuestion;
})(H5P.EventDispatcher, H5P.jQuery, H5P.CKEDITOR);
