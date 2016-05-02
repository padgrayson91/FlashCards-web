Decks = new Mongo.Collection("decks")

/**
The cards are no longer directly associated with a deck.
Instead, every card will have its own entry in the "cards"
collection with references to which deck it is in.  This
is structurally odd, but it helps avoid nesting a lot of arrays
*/
Cards = new Mongo.Collection("cards")

if(Meteor.isServer){
	Meteor.publish("decks", function () {
    return Decks.find({
      $or: [
        { is_public: {$eq: true} },
        { owner: this.userId }
      ]
    });
  });
  Meteor.publish("cards", function() {
    return Cards.find({
      $or: [
        { is_public: {$eq: true}},
        { owner: this.userId}
      ]
    })
  });
  console.log(Decks.find({}))
  console.log(Cards.find({}))
}

if (Meteor.isClient) {
  // This code only runs on the client
  Meteor.subscribe("decks")
  Meteor.subscribe("cards")

  Meteor.startup(function () {
    _.extend(Notifications.defaultOptions, {
        timeout: 1000
    });
  });
  console.log("User id: " + Meteor.userId())
  Router.route("/", {
    template: 'home'
  });
  Router.route("/deck-detail/:_id", {
    template: 'deckDetail',
    data: function(){
      var selectedDeck = this.params._id
      return Decks.findOne(selectedDeck)
    }
  });
  Router.route("/player/:_id", {
    template: 'player',
    data: function(){
      var selectedDeck = this.params._id
      return Decks.findOne(selectedDeck)
    }
  });
  Template.home.helpers({
    decks: function(){
    	return(Decks.find({}))
    }
  });
  Template.home.events({
  	"submit .new-deck":function(event){
  		event.preventDefault();
  		var name = event.target.name.value;
  		var checked = event.target.checkbox.checked
  		Meteor.call("addDeck", name, checked)
  		event.target.name.value = "";
  	}
  });
  Template.deck.helpers({
  	isPublic: function(){
  		var deck = Decks.findOne(this._id)
  		return deck.is_public
  	},
  	isOwner: function(){
  		return this.owner === Meteor.userId()
  	}
  });
  Template.deck.events({
  	"click .delete": function() {
  		Meteor.call("deleteDeck", this._id)
  	},
    "click": function() {
      console.log("Clicked a deck: " + this._id)
      Router.go("/deck-detail/" + this._id)
    },
    "click .play":function() {
      Session.set("currentIndex", 0)
      Router.go("/player/" + this._id)
    }
  });
  Template.deckDetail.helpers({
    cards: function(){
      var self = this
      console.log(this.deck_cards)
      cards_for_deck = new Array()
      if(this.deck_cards){
      this.deck_cards.forEach(function(entry) {
        cards_for_deck.push(Cards.findOne(entry))
      });
      }
      console.log(cards_for_deck)
      return _.map(cards_for_deck, function(p){
        p.parent = self
        return p
      });
    },
    currentDeck: function(){
      return this.deck_name
    },
    isOwner: function(){
      return this.owner === Meteor.userId()
    },
    isAdding: function(){
      return Session.get("addingCard")
    }
  });
  Template.deckDetail.events({
    "submit .new-card":function(event){
      event.preventDefault();
      var question = event.target.question.value;
      var answer = event.target.answer.value;
      var options = new Array();
      if(event.target.option1.value){
        options.push(event.target.option1.value)
      }
      if(event.target.option2.value){
        options.push(event.target.option2.value)
      }
      if(event.target.option3.value){
        options.push(event.target.option3.value)
      }
      Meteor.call("addCard", this._id, question, answer, options)
      event.target.question.value = "";
      event.target.answer.value = "";
      Session.set("addingCard", false)
    },
    "click .add-button":function(event){
      Session.set("addingCard", true)
    },
    "click .cancel-button":function(event){
      Session.set("addingCard", false)
    },
    "click .play":function() {
      Session.set("currentIndex", 0)
      Router.go("/player/" + this._id)
    }
  });
  Template.card.helpers({
    cardScore: function(){
      return 0
      var card = Cards.findOne(this._id)
      var userId = Meteor.userId()
      if(card.card_scores[userId]){
        var scoreBlob = card.card_scores[userId]
        return scoreBlob.times_correct - scoreBlob.times_incorrect
      } else {
        return 0
      }
      
    }
  });
  Template.card.events({
    "click .delete": function() {
      Meteor.call("deleteCard",  this.parent._id, this._id)
    },
    "click":function() {
      var user = Meteor.user()
      var cardId = this._id
      console.log(user)
      if(!user.scores){
        Meteor.call("createUserScores", Meteor.userId(), cardId)
      }
      console.log(user.scores)
      console.log(cardId)
      console.log(user.scores.filter(function(obj) { return obj._id == cardId}))
    }
  });
  Template.player.helpers({
    currentCard: function(){
      if(!Session.get("currentIndex")){
        Session.set("currentIndex", 0)
      }
      var card = Cards.findOne(this.deck_cards[Session.get("currentIndex")])
      return card
    },
    answerChoices: function(){
      var card = Cards.findOne(this.deck_cards[Session.get("currentIndex")])
      var options = new Array()
      options = options.concat(card.card_options)
      options.push(card.card_answer)
      for (var i = options.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = options[i];
        options[i] = options[j];
        options[j] = temp;
      }
      return options
    }
  });
  Template.player.events({
    "click .skip": function(){
      if(Session.get("currentIndex") == (this.deck_cards.length - 1)){
        //we're done
        Router.go("/deck-detail/" + this._id)
      } else {
        Session.set("currentIndex", Session.get("currentIndex") + 1)
      }
    },
    "click .answer": function(event){
      var user_answer = event.target.getAttribute("text")
      var deck = Template.parentData(1)
      var card = Cards.findOne(deck.deck_cards[Session.get("currentIndex")])
      if(user_answer === card.card_answer){
        //Correct! :D
        var notificationId = Notifications.success('Correct!', 'Great job!');
        Meteor.setTimeout( function () {
          Notifications.remove({ _id: notificationId });
        }, 1500);
      } else {
        var notificationId = Notifications.error('Incorrect', 'The correct answer was: ' + card.card_answer)
        Meteor.setTimeout( function () {
          Notifications.remove({ _id: notificationId });
        }, 1500);
        //Wrong :(
      }
      if(Session.get("currentIndex") == (deck.deck_cards.length - 1)){
        //we're done, but need to sleep for a bit to show notification
        Meteor.sleep(1500)
        Router.go("/deck-detail/" + deck._id)
        Meteor.setTimeout( function () {
          Notifications.success('Deck complete!', 'Nice work, keep it up!');
        }, 1500);
      } else {
        Session.set("currentIndex", Session.get("currentIndex") + 1)
      }

    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
});

}

Meteor.methods({
  		addDeck: function (name, is_public) {
  			Decks.insert({
  				deck_name: name,
  				created_at: new Date(),
  				owner: Meteor.userId(),
  				is_public: is_public,
          deck_cards: new Array()
  			});
  		},
  		deleteDeck: function (deckId) {
      		Decks.remove(deckId);
      },
      addCard: function (deckId, question, answer, options){
        if(question && answer && options){
          console.log("Adding card!")
          var deck = Decks.findOne(deckId)
          var card = {
            is_public: deck.is_public,
            owner: Meteor.userId(),
            card_answer: answer,
            card_question: question,
            created_at: new Date(),
            card_options: options,
            card_scores: new Array()
          };
          Cards.insert(card, function(err,docsInserted) {
            var deck = Decks.findOne(deckId)
            console.log(docsInserted)
            deck.deck_cards.push(docsInserted)
            Decks.update(deckId, deck)
          });

        }

      },
      deleteCard: function (deckId, cardId){
        var deck = Decks.findOne(deckId)
        var index = deck.deck_cards.indexOf(cardId)
        if(index > -1){
          deck.deck_cards.remove(index)
        }
        Decks.update(deckId, deck)
        var other_decks = Decks.find({"deck_cards": { $elemMatch: {cardId} } })
        if(!other_decks){
          //If there are no other decks containing this card, just dump it entirely
          Cards.remove(cardId)
        }
      },
      createUserScores: function (userId, cardId){
        console.log("Updating user")
        var user = Meteor.users.findOne(userId)
        user.scores = new Array()
        user.scores.push({
          "_id":cardId,
          "times_incorrect":0,
          "times_correct":0
        })
        Meteor.users.update({"_id":user._id}, {"$push": {"scores": user.scores}});
        console.log(Meteor.users.findOne(userId))

      },
      createScoresForCard: function (userId, cardId){
        var user = Meteor.users.findOne(userId)
        user.scores.push({
          "_id":cardId,
          "times_incorrect":0,
          "times_correct":0
        });
        Meteor.users.update({"_id":userId}, {"$push": {"scores": user.scores}});
      }
});
