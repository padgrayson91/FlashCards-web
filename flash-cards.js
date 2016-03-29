Decks = new Mongo.Collection("decks")

if(Meteor.isServer){
	Meteor.publish("decks", function () {
    return Decks.find({
      $or: [
        { is_public: {$eq: true} },
        { owner: this.userId }
      ]
    });
  });
}

if (Meteor.isClient) {
  // This code only runs on the client
  Meteor.subscribe("decks")
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
    }
  });
  Template.deckDetail.helpers({
    cards: function(){
      var self = this
      return _.map(self.deck_cards, function(p){
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
    }
  });
  Template.card.helpers({
    cardScore: function(){
      return this.card_times_correct - this.card_times_incorrect
    }
  });
  Template.card.events({
    "click .delete": function() {
      Meteor.call("deleteCard",  this.parent._id, this._id)
    },
  })

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
  				deck_cards: new Array(),
  				is_public: is_public
  			});
  		},
  		deleteDeck: function (deckId) {
      		Decks.remove(deckId);
      },
      addCard: function (deckId, question, answer, options){
        if(question && answer && options){
          var deck = Decks.findOne(deckId)
          var card = {
            _id: new Meteor.Collection.ObjectID()._str,
            card_question: question,
            card_answer: answer,
            created_at: new Date(),
            card_options: options,
            card_times_correct: 0,
            card_times_incorrect: 0
          };
          deck.deck_cards.push(card);
          Decks.update(deckId, deck)
        }
      },
      deleteCard: function (deckId, cardId){
        console.log("Deleting card " + cardId + " from deck " + deckId)
        Decks.update({ "_id": deckId}, {$pull: {"deck_cards": {"_id": cardId}}})
      }
});
