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
      return this.deck_cards
    },
    currentDeck: function(){
      return this.deck_name
    },
    isOwner: function(){
      return this.owner === Meteor.userId()
    }
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
    	}
});
